import pandas as pd

CSV_PATH = "../data/styles.csv"
df = pd.read_csv(CSV_PATH, quotechar='"', on_bad_lines='skip')

print(df.columns.tolist())
