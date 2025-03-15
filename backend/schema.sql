-- Users table to store authentication information
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password VARCHAR(255) NOT NULL,  -- In production, store hashed passwords
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Decisions table to store user decision data
CREATE TABLE IF NOT EXISTS decisions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Items table to store pros and cons
CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    decision_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    weight INTEGER NOT NULL,
    type VARCHAR(10) NOT NULL,  -- 'pro' or 'con'
    FOREIGN KEY (decision_id) REFERENCES decisions (id) ON DELETE CASCADE
);

-- Create an initial user for testing
INSERT INTO users (username, email, password)
VALUES ('test', 'test@example.com', 'password')
ON CONFLICT (username) DO NOTHING;
