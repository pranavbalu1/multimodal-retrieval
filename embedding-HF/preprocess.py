# preprocess.py
import os
import pandas as pd
from PIL import Image
from tqdm import tqdm
from torchvision import transforms

# -----------------------------
# Paths
# -----------------------------
CSV_PATH = "../data/styles.csv"       # original CSV
IMAGE_FOLDER = "../data/images"              # folder with images
PREPROCESSED_CSV = "../data/preprocessed_products.csv"

# -----------------------------
# Load CSV with robust parsing
# -----------------------------
print("Loading CSV...")
df = pd.read_csv(CSV_PATH, quotechar='"', on_bad_lines='skip')
print(f"Total products: {len(df)}")

# -----------------------------
# Preprocess Text
# -----------------------------
def clean_text(text):
    if pd.isna(text):
        return ""
    return str(text).strip().lower()

print("Cleaning text fields...")
# Clean main product name
df['productDisplayName'] = df['productDisplayName'].apply(clean_text)

# Concatenate metadata for richer embeddings
df['text_for_embedding'] = (
    df['productDisplayName'] + " " +
    df['masterCategory'].fillna('') + " " +
    df['subCategory'].fillna('') + " " +
    df['articleType'].fillna('') + " " +
    df['baseColour'].fillna('')
).apply(clean_text)

# -----------------------------
# Preprocess Images
# -----------------------------
print("Preparing image transforms...")
image_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.CenterCrop(224),
    transforms.ToTensor()
])

def load_image(image_name):
    """Load and preprocess image. Returns tensor or None if missing."""
    if image_name is None:
        return None
    path = os.path.join(IMAGE_FOLDER, image_name)
    if not os.path.exists(path):
        return None
    try:
        img = Image.open(path).convert('RGB')
        return image_transform(img)
    except Exception as e:
        print(f"Error loading {image_name}: {e}")
        return None

# Map images based on ID
def map_image(row):
    # Example: filenames like 1.jpg, 2.jpg, etc. Adjust if your files differ.
    possible_name = f"{row['id']}.jpg"
    if os.path.exists(os.path.join(IMAGE_FOLDER, possible_name)):
        return possible_name
    return None

print("Mapping images...")
df['image_file'] = df.apply(map_image, axis=1)
print(df['image_file'].dropna().head())


# Test loading a sample image (skip if none found)
non_null_images = df['image_file'].dropna()
if len(non_null_images) > 0:
    sample_image_name = non_null_images.iloc[0]
    sample_tensor = load_image(sample_image_name)
    print(f"Sample image tensor shape: {sample_tensor.shape}")
else:
    print("No images found, skipping sample image test.")

# -----------------------------
# Batch Preparation (for embeddings)
# -----------------------------
BATCH_SIZE = 100

def get_batches(df, batch_size=BATCH_SIZE):
    for i in range(0, len(df), batch_size):
        yield df.iloc[i:i+batch_size]

print("Preparing batches...")
for batch_df in get_batches(df):
    texts = batch_df['text_for_embedding'].tolist()   # MiniLM input
    images = [load_image(img) for img in batch_df['image_file'].tolist()]  # CLIP input
    # images may contain None if missing files
    break  # remove break to process all batches

# -----------------------------
# Optional: Save preprocessed CSV
# -----------------------------
df.to_csv(PREPROCESSED_CSV, index=False)
print(f"Preprocessed CSV saved to {PREPROCESSED_CSV}")
