"""
STEP 2 — train_model.py
========================
Uses MobileNetV2 transfer learning — gives 90%+ accuracy even on small datasets.
A custom CNN from scratch only reaches ~70% on 300 images/class.

Run from vision/ folder:  python train_model.py
Training time: ~10-15 minutes on CPU, ~3 min on GPU
"""

import os, json
import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, models, Model
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from sklearn.utils.class_weight import compute_class_weight

# ── Config ────────────────────────────────────────────────────────────────────
DATASET_DIR  = "dataset"
IMG_SIZE     = 224          # MobileNetV2 works best at 224x224
BATCH_SIZE   = 32
EPOCHS_HEAD  = 10           # Phase 1: train only top layers
EPOCHS_FINE  = 10           # Phase 2: fine-tune last 30 layers
SEED         = 42

# ── Dataset summary ───────────────────────────────────────────────────────────
print("\n📊 Dataset Summary")
print("=" * 60)
total, class_img_counts = 0, {}
for cls in sorted(os.listdir(DATASET_DIR)):
    p = os.path.join(DATASET_DIR, cls)
    if not os.path.isdir(p): continue
    n = len([f for f in os.listdir(p) if f.lower().endswith(('.jpg','.jpeg','.png'))])
    class_img_counts[cls] = n
    flag = " ⚠️  (unequal!)" if abs(n - 300) > 50 else ""
    print(f"  {cls:<55} {n:>4} images{flag}")
    total += n
print(f"  {'TOTAL':<55} {total:>4}")
print("=" * 60)

# ── Data generators ───────────────────────────────────────────────────────────
train_datagen = ImageDataGenerator(
    rescale            = 1./255,
    validation_split   = 0.2,
    rotation_range     = 30,
    width_shift_range  = 0.15,
    height_shift_range = 0.15,
    shear_range        = 0.1,
    zoom_range         = 0.25,
    horizontal_flip    = True,
    brightness_range   = [0.8, 1.2],
    channel_shift_range= 20.0,
    fill_mode          = 'nearest',
)
val_datagen = ImageDataGenerator(rescale=1./255, validation_split=0.2)

print("\n📂 Loading data...")
train_gen = train_datagen.flow_from_directory(
    DATASET_DIR, target_size=(IMG_SIZE, IMG_SIZE), batch_size=BATCH_SIZE,
    class_mode='sparse', subset='training', seed=SEED, shuffle=True)

val_gen = val_datagen.flow_from_directory(
    DATASET_DIR, target_size=(IMG_SIZE, IMG_SIZE), batch_size=BATCH_SIZE,
    class_mode='sparse', subset='validation', seed=SEED, shuffle=False)

class_names = list(train_gen.class_indices.keys())
num_classes = len(class_names)
print(f"\n✅ {num_classes} classes: {class_names}")

# Save class indices for vision_service.py
with open("class_indices.json", "w") as f:
    json.dump(train_gen.class_indices, f, indent=2)
print("✅ Saved class_indices.json")

# ── Class weights ─────────────────────────────────────────────────────────────
cw = compute_class_weight('balanced',
     classes=np.unique(train_gen.classes), y=train_gen.classes)
class_weight_dict = dict(enumerate(cw))
print(f"⚖️  Weights: { {class_names[k]:round(v,2) for k,v in class_weight_dict.items()} }")

# ── Model: MobileNetV2 transfer learning ──────────────────────────────────────
print("\n🔧 Building MobileNetV2 transfer learning model...")

base_model = MobileNetV2(
    input_shape = (IMG_SIZE, IMG_SIZE, 3),
    include_top = False,
    weights     = 'imagenet',    # pretrained on 1M images — huge advantage
)
base_model.trainable = False     # freeze base first

inputs  = tf.keras.Input(shape=(IMG_SIZE, IMG_SIZE, 3))
x       = base_model(inputs, training=False)
x       = layers.GlobalAveragePooling2D()(x)
x       = layers.Dense(256, activation='relu')(x)
x       = layers.BatchNormalization()(x)
x       = layers.Dropout(0.4)(x)
outputs = layers.Dense(num_classes, activation='softmax')(x)

model = Model(inputs, outputs)

callbacks_base = [
    tf.keras.callbacks.ModelCheckpoint(
        "plant_disease_model.h5", monitor="val_accuracy",
        save_best_only=True, verbose=1),
    tf.keras.callbacks.EarlyStopping(
        monitor="val_accuracy", patience=5,
        restore_best_weights=True, verbose=1),
    tf.keras.callbacks.ReduceLROnPlateau(
        monitor="val_loss", factor=0.5, patience=2, min_lr=1e-7, verbose=1),
]

# ── PHASE 1: Train head only ──────────────────────────────────────────────────
print(f"\n🚀 PHASE 1: Training classification head ({EPOCHS_HEAD} epochs)...")
model.compile(
    optimizer = tf.keras.optimizers.Adam(0.001),
    loss      = 'sparse_categorical_crossentropy',
    metrics   = ['accuracy'],
)
hist1 = model.fit(
    train_gen, epochs=EPOCHS_HEAD, validation_data=val_gen,
    class_weight=class_weight_dict, callbacks=callbacks_base)

p1_acc = max(hist1.history.get('val_accuracy', [0]))
print(f"\n   Phase 1 best val accuracy: {p1_acc*100:.1f}%")

# ── PHASE 2: Fine-tune last 30 layers ─────────────────────────────────────────
print(f"\n🔥 PHASE 2: Fine-tuning last 30 layers ({EPOCHS_FINE} epochs)...")
base_model.trainable = True
for layer in base_model.layers[:-30]:
    layer.trainable = False

model.compile(
    optimizer = tf.keras.optimizers.Adam(0.0001),   # much lower LR for fine-tuning
    loss      = 'sparse_categorical_crossentropy',
    metrics   = ['accuracy'],
)

callbacks_fine = [
    tf.keras.callbacks.ModelCheckpoint(
        "plant_disease_model.h5", monitor="val_accuracy",
        save_best_only=True, verbose=1),
    tf.keras.callbacks.EarlyStopping(
        monitor="val_accuracy", patience=6,
        restore_best_weights=True, verbose=1),
    tf.keras.callbacks.ReduceLROnPlateau(
        monitor="val_loss", factor=0.3, patience=3, min_lr=1e-8, verbose=1),
]

hist2 = model.fit(
    train_gen, epochs=EPOCHS_FINE, validation_data=val_gen,
    class_weight=class_weight_dict, callbacks=callbacks_fine)

# ── Final report ──────────────────────────────────────────────────────────────
all_val_acc = hist1.history.get('val_accuracy',[]) + hist2.history.get('val_accuracy',[])
best = max(all_val_acc) if all_val_acc else 0

print("\n" + "=" * 60)
print(f"✅ Training complete!")
print(f"   Phase 1 best : {p1_acc*100:.1f}%")
print(f"   Overall best : {best*100:.1f}%")
print(f"   Model saved  : plant_disease_model.h5")
print(f"   Classes      : {class_names}")
print("=" * 60)

if best >= 0.90:
    print("🎉 Excellent! >90% accuracy — great for your project submission!")
elif best >= 0.80:
    print("👍 Good! >80% accuracy. Add more data to push higher.")
elif best >= 0.70:
    print("⚠️  70-80% accuracy. See tips below.")
    print("   TIP: Add 100 more images per class and retrain.")
else:
    print("❌ Below 70%. Dataset likely still imbalanced.")
    print("   Run prepare_dataset.py again — make sure all classes have ~300 images.")
