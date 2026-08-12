import os
import pandas as pd
from sqlalchemy import create_engine
from dotenv import load_dotenv

# Load your local .env file containing the DATABASE_URL
load_dotenv()
engine = create_engine(os.environ.get("DATABASE_URL"))

# Fetch the 5 most recent rows
query = "SELECT datetime, pm2_5_ugm3, temp_celsius FROM aqi_features ORDER BY datetime DESC LIMIT 5"
latest_data = pd.read_sql(query, engine)

print("--- Latest Supabase Entries ---")
print(latest_data)