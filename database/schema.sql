

CREATE DATABASE IF NOT EXISTS refconnect;
USE refconnect;


CREATE TABLE IF NOT EXISTS users (
    user_id      INT AUTO_INCREMENT PRIMARY KEY,
    name         VARCHAR(100) NOT NULL,
    email        VARCHAR(100) NOT NULL UNIQUE,
    password     VARCHAR(255) NOT NULL,
    role         ENUM('student', 'alumni', 'employee', 'recruiter') NOT NULL DEFAULT 'student',
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_users_email (email),
    INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS profiles (
    profile_id   INT AUTO_INCREMENT PRIMARY KEY,
    user_id      INT NOT NULL UNIQUE,
    bio          TEXT,
    education    VARCHAR(200),
    experience   TEXT,
    resume_link  VARCHAR(255),
    linkedin     VARCHAR(255),
    github       VARCHAR(255),
    location     VARCHAR(100),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS skills (
    skill_id     INT AUTO_INCREMENT PRIMARY KEY,
    skill_name   VARCHAR(100) NOT NULL UNIQUE,
    INDEX idx_skill_name (skill_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_skills (
    user_id      INT NOT NULL,
    skill_id     INT NOT NULL,
    PRIMARY KEY (user_id, skill_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(skill_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 5. Jobs Table
-- ============================================
CREATE TABLE IF NOT EXISTS jobs (
    job_id        INT AUTO_INCREMENT PRIMARY KEY,
    recruiter_id  INT NOT NULL,
    company_name  VARCHAR(100) NOT NULL,
    title         VARCHAR(100) NOT NULL,
    description   TEXT,
    location      VARCHAR(100),
    salary        DECIMAL(10,2),
    deadline      DATE,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recruiter_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_jobs_recruiter (recruiter_id),
    INDEX idx_jobs_company (company_name),
    INDEX idx_jobs_deadline (deadline)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS job_skills (
    job_id       INT NOT NULL,
    skill_id     INT NOT NULL,
    PRIMARY KEY (job_id, skill_id),
    FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(skill_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS connections (
    connection_id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id     INT NOT NULL,
    receiver_id   INT NOT NULL,
    status        ENUM('pending', 'accepted', 'rejected') NOT NULL DEFAULT 'pending',
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_conn_sender (sender_id),
    INDEX idx_conn_receiver (receiver_id),
    INDEX idx_conn_status (status),
    UNIQUE KEY uk_connection (sender_id, receiver_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS referral_requests (
    referral_id   INT AUTO_INCREMENT PRIMARY KEY,
    applicant_id  INT NOT NULL,
    referrer_id   INT NOT NULL,
    job_id        INT NOT NULL,
    status        ENUM('pending', 'accepted', 'rejected') NOT NULL DEFAULT 'pending',
    message       TEXT,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (applicant_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (referrer_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE CASCADE,
    INDEX idx_ref_applicant (applicant_id),
    INDEX idx_ref_referrer (referrer_id),
    INDEX idx_ref_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS applications (
    application_id INT AUTO_INCREMENT PRIMARY KEY,
    applicant_id   INT NOT NULL,
    job_id         INT NOT NULL,
    status         ENUM('applied', 'referred', 'interview_scheduled', 'selected', 'rejected') NOT NULL DEFAULT 'applied',
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (applicant_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE CASCADE,
    INDEX idx_app_applicant (applicant_id),
    INDEX idx_app_job (job_id),
    INDEX idx_app_status (status),
    UNIQUE KEY uk_application (applicant_id, job_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
