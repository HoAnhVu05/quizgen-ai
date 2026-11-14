-- ====================================================================
-- QUIZGEN AI - DATABASE INITIALIZATION SCRIPT (POSTGRESQL 16)
-- Microservices Database-per-Service / Multi-Schema Initialization
-- ====================================================================

-- 1. Create individual schemas for each microservice
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS documents;
CREATE SCHEMA IF NOT EXISTS rag;
CREATE SCHEMA IF NOT EXISTS ai;
CREATE SCHEMA IF NOT EXISTS exams;

-- Grant usage on schemas
GRANT ALL ON SCHEMA auth TO PUBLIC;
GRANT ALL ON SCHEMA documents TO PUBLIC;
GRANT ALL ON SCHEMA rag TO PUBLIC;
GRANT ALL ON SCHEMA ai TO PUBLIC;
GRANT ALL ON SCHEMA exams TO PUBLIC;
