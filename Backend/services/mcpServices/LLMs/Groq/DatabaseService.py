from pymongo import MongoClient
from services.mcpServices.LLMs.Groq.LoggerService import get_logger

logger = get_logger("MCP.DatabaseService")

MONGO_URI = "mongodb+srv://devanshu4943:mojJ72mDeo3Ugtw5@cluster0.qn7sjep.mongodb.net/"

class DatabaseService:
    def __init__(self, uri=MONGO_URI):
        self.uri = uri
        self.client = None
        self.db = None

    def connect(self):
        logger.info("Connecting to MongoDB at %s", self.uri)
        self.client = MongoClient(self.uri)
        self.client.admin.command('ping')
        logger.info("Successfully pinged MongoDB server")
        self.db = self.client["New_Brsr"]

    def get_db(self):
        if not self.db:
            self.connect()
        return self.db


def get_database_service():
    return DatabaseService()
