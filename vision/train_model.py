import tensorflow as tf
from tensorflow.keras import layers, models
import os

# dataset path (you will add images later)
DATASET_DIR = "dataset"

IMG_SIZE = 128
BATCH_SIZE = 32

# load dataset
train_data = tf.keras.preprocessing.image_dataset_from_directory(
    DATASET_DIR,
    image_size=(IMG_SIZE, IMG_SIZE),
    batch_size=BATCH_SIZE
)

# get class names
class_names = train_data.class_names
print("Classes:", class_names)

# build CNN model
model = models.Sequential([
    layers.Rescaling(1./255, input_shape=(IMG_SIZE, IMG_SIZE, 3)),

    layers.Conv2D(32, (3,3), activation='relu'),
    layers.MaxPooling2D(),

    layers.Conv2D(64, (3,3), activation='relu'),
    layers.MaxPooling2D(),

    layers.Conv2D(128, (3,3), activation='relu'),
    layers.MaxPooling2D(),

    layers.Flatten(),
    layers.Dense(128, activation='relu'),
    layers.Dropout(0.5),

    layers.Dense(len(class_names), activation='softmax')
])

model.compile(
    optimizer='adam',
    loss='sparse_categorical_crossentropy',
    metrics=['accuracy']
)

# train model
model.fit(train_data, epochs=5)

# save model
model.save("plant_disease_model.h5")

print("Model trained and saved!")