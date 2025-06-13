from pymongo import MongoClient
from pymongo.errors import CollectionInvalid
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def init_db():
    # Connect to MongoDB
    client = MongoClient(os.getenv("MONGODB_URL", "mongodb://localhost:27017"))
    db = client[os.getenv("DB_NAME", "brsr_db")]
    
    # Collections to create with their indexes
    collections_config = {
        "reports": [
            ("name", {"unique": True}),
        ],
        "modules": [
            ("report_id", {}),
            ("name", {})
        ],
        "companies": [
            ("name", {"unique": True}),
        ],
        "plants": [
            ("company_id", {}),
            ("plant_code", {"unique": True}),
            (("company_id", "plant_code"), {"unique": True})
        ],
        "questions": [
            ("question_number", {"unique": True}),
            ("category_id", {})
        ],
        "answers": [
            (("module_id", "question_id", "plant_id"), {"unique": True}),
            ("plant_id", {}),
            ("module_id", {})
        ],
        "user_access": [
            ("user_id", {}),
            ("plant_id", {}),
            ("company_id", {}),
            (("user_id", "plant_id"), {"unique": True})
        ],
        "environment": [
            (("companyId", "financialYear"), {"unique": True}),
            ("companyId", {}),
            ("financialYear", {}),
            ("status", {}),
        ]
    }

    print("Initializing database collections and indexes...")
    
    for collection_name, indexes in collections_config.items():
        # Create collection if it doesn't exist
        try:
            db.create_collection(collection_name)
            print(f"Created collection: {collection_name}")
        except CollectionInvalid:
            print(f"Collection already exists: {collection_name}")

        # Create indexes
        collection = db[collection_name]
        for index_fields, index_options in indexes:
            if isinstance(index_fields, str):
                index_fields = [(index_fields, 1)]
            elif isinstance(index_fields, tuple):
                index_fields = [(field, 1) for field in index_fields]
            
            collection.create_index(index_fields, **index_options)
            print(f"Created index on {collection_name}: {index_fields}")

    print("\nDatabase initialization completed!")
    
    # Print collection statistics
    print("\nCollection Statistics:")
    for collection_name in collections_config.keys():
        count = db[collection_name].count_documents({})
        print(f"{collection_name}: {count} documents")

if __name__ == "__main__":
    init_db()