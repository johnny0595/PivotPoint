# PivotPoint Backend Setup

## Setup Instructions

```bash
# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## API Endpoints

- `GET /api/decisions` - List all decisions for a user
- `POST /api/decisions` - Create a new decision
- `PUT /api/decisions/<id>` - Update a decision
- `DELETE /api/decisions/<id>` - Delete a decision
- `POST /api/decisions/<id>/items` - Add an item to a decision
- `PUT /api/items/<id>` - Update an item
- `DELETE /api/items/<id>` - Delete an item
