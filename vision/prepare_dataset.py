"""
STEP 1 — prepare_dataset.py
============================
Balances your dataset to exactly 300 images per class.
Run from vision/ folder:  python prepare_dataset.py

EDIT the KAGGLE_DIR path below before running!
"""

import os, shutil, random

# ── ✏️  EDIT THIS LINE with your actual path ──────────────────────────────────
KAGGLE_DIR = r"C:\Users\hp\Desktop\PlantProject\raw_plant_dataset"
# ─────────────────────────────────────────────────────────────────────────────

OUTPUT_DIR    = "dataset"
MAX_PER_CLASS = 300   # keep exactly 300 per class = balanced model
SEED          = 42

# 10 classes — good coverage for a minor project
CLASSES = [
    "Potato__Early_blight",
    "Potato__Late_blight",
    "Potato__healthy",
    "Tomato__Early_blight",
    "Tomato__Late_blight",
    "Tomato__healthy",
    "Tomato__Tomato_Yellow_Leaf_Curl_Virus",
    "Tomato__Bacterial_spot",
    "Corn_(maize)__Common_rust_",
    "Corn_(maize)__healthy",
]

random.seed(SEED)

def find_folder(base, target):
    """Find folder even if _ vs ___ differs."""
    norm = lambda s: s.lower().replace("___","__").replace("_","").replace(" ","")
    for f in os.listdir(base):
        if norm(f) == norm(target):
            return f
    return None

def prepare():
    if not os.path.exists(KAGGLE_DIR):
        print(f"\n❌ Path not found: {KAGGLE_DIR}")
        print("   Open prepare_dataset.py and fix KAGGLE_DIR.\n")
        return

    print(f"\n🌿 Plant AI — Dataset Preparation")
    print(f"   Source : {KAGGLE_DIR}")
    print(f"   Output : {os.path.abspath(OUTPUT_DIR)}")
    print(f"   Target : {MAX_PER_CLASS} images per class")
    print("=" * 55)

    # ── Wipe old dataset so no leftover imbalanced images remain ──────────────
    if os.path.exists(OUTPUT_DIR):
        shutil.rmtree(OUTPUT_DIR)
        print("🗑️  Removed old dataset folder (starting fresh)\n")

    total_copied = 0
    not_found    = []

    for cls in CLASSES:
        actual = find_folder(KAGGLE_DIR, cls)
        if not actual:
            print(f"  ❌ NOT FOUND : {cls}")
            not_found.append(cls)
            continue

        src = os.path.join(KAGGLE_DIR, actual)
        dst = os.path.join(OUTPUT_DIR, actual)   # use Kaggle name as-is
        os.makedirs(dst, exist_ok=True)

        imgs = [f for f in os.listdir(src)
                if f.lower().endswith(('.jpg','.jpeg','.png'))]
        random.shuffle(imgs)
        selected = imgs[:MAX_PER_CLASS]

        for img in selected:
            shutil.copy2(os.path.join(src, img), os.path.join(dst, img))

        total_copied += len(selected)
        status = "✅" if len(selected) == MAX_PER_CLASS else "⚠️ "
        print(f"  {status} {actual:<55} → {len(selected):>3} images copied")

    print(f"\n{'='*55}")
    print(f"  Total images copied : {total_copied}")
    print(f"  Classes ready       : {len(CLASSES)-len(not_found)}/{len(CLASSES)}")

    if not_found:
        print(f"\n  ⚠️  Missing classes (check folder names in Kaggle zip):")
        for c in not_found:
            print(f"     • {c}")

    print(f"\n✅ Done! Now run:  python train_model.py\n")

if __name__ == "__main__":
    prepare()
