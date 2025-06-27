# Example Prompts and MongoDB Update Queries for `environment` Collection

## 1. Update a Specific Answer

**Prompt:**  
Update the answer for EC-1 for companyId `761cb49d-0519-4ea0-b909-4b7585d5b832` to "New answer text".

**Query:**
```json
{
  "isDbRelated": true,
  "response": {
    "collection": "environment",
    "query": { "companyId": "761cb49d-0519-4ea0-b909-4b7585d5b832" },
    "update": {
      "$set": {
        "answers.EC-1": {
          "questionId": "EC-1",
          "questionTitle": "...",
          "updatedData": { "text": "New answer text" },
          "lastUpdated": "<current_datetime>"
        },
        "updatedAt": "<current_datetime>"
      }
    }
  }
}
```

---

## 2. Add a Comment to a Question

**Prompt:**  
Add comment "Needs review" to EC-1 for companyId `761cb49d-0519-4ea0-b909-4b7585d5b832`.

**Query:**
```json
{
  "isDbRelated": true,
  "response": {
    "collection": "environment",
    "query": { "companyId": "761cb49d-0519-4ea0-b909-4b7585d5b832" },
    "update": {
      "$push": {
        "answers.EC-1.comments": { "text": "Needs review", "timestamp": "<current_datetime>" }
      },
      "$set": { "updatedAt": "<current_datetime>" }
    }
  }
}
```

---

## 3. Update Attachments for a Question

**Prompt:**  
Set attachments for EC-1 to `['url1', 'url2']` for companyId `761cb49d-0519-4ea0-b909-4b7585d5b832`.

**Query:**
```json
{
  "isDbRelated": true,
  "response": {
    "collection": "environment",
    "query": { "companyId": "761cb49d-0519-4ea0-b909-4b7585d5b832" },
    "update": {
      "$set": {
        "answers.EC-1.attachments": ["url1", "url2"],
        "answers.EC-1.lastUpdated": "<current_datetime>",
        "updatedAt": "<current_datetime>"
      }
    }
  }
}
```

---

## 4. Update Report Status

**Prompt:**  
Set the status to "submitted" for companyId `761cb49d-0519-4ea0-b909-4b7585d5b832` in 2024-2025.

**Query:**
```json
{
  "isDbRelated": true,
  "response": {
    "collection": "environment",
    "query": { "companyId": "761cb49d-0519-4ea0-b909-4b7585d5b832", "financialYear": "2024-2025" },
    "update": {
      "$set": { "status": "submitted", "updatedAt": "<current_datetime>" }
    }
  }
}
```

---

## 5. Update Audit Status for a Question

**Prompt:**  
Mark EC-1 as audited for companyId `761cb49d-0519-4ea0-b909-4b7585d5b832`.

**Query:**
```json
{
  "isDbRelated": true,
  "response": {
    "collection": "environment",
    "query": { "companyId": "761cb49d-0519-4ea0-b909-4b7585d5b832" },
    "update": {
      "$set": { "audit_statuses.EC-1": true, "updatedAt": "<current_datetime>" }
    }
  }
}
```

---

## 6. Bulk Update Answers

**Prompt:**  
Bulk update answers for EC-1 and WU-1 for companyId `761cb49d-0519-4ea0-b909-4b7585d5b832`.

**Query:**
```json
{
  "isDbRelated": true,
  "response": {
    "collection": "environment",
    "query": { "companyId": "761cb49d-0519-4ea0-b909-4b7585d5b832" },
    "update": {
      "$set": {
        "answers.EC-1": { /* ... */ },
        "answers.WU-1": { /* ... */ },
        "updatedAt": "<current_datetime>"
      }
    }
  }
}
```

---

## 7. Two-Step Company Name to ID Mapping

**Prompt:**  
Update the answer for EC-1 for Aditya Birla Pvt. Ltd. to "New answer text".

**Step 1 (Get companyId):**
```json
{
  "collection": "companies",
  "query": { "name": { "$regex": "Aditya Birla Pvt. Ltd.", "$options": "i" } },
  "projection": { "metadata.id": 1, "_id": 0 }
}
```
**Step 2 (Update answer using companyId):**
```json
{
  "collection": "environment",
  "query": { "companyId": "<companyId-from-step-1>" },
  "update": {
    "$set": {
      "answers.EC-1": {
        "questionId": "EC-1",
        "questionTitle": "...",
        "updatedData": { "text": "New answer text" },
        "lastUpdated": "<current_datetime>"
      },
      "updatedAt": "<current_datetime>"
    }
  }
}
```
