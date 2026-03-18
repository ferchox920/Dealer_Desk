# 🚗 Dealer Desk — Copilot Context (Flexible Architecture)

## 🧠 IMPORTANT CONTEXT (READ FIRST)

This document describes the **intended vision and direction** of the project.

⚠️ IMPORTANT:
- This is NOT a strict specification
- This is NOT a step-by-step instruction manual
- This is NOT mandatory architecture

It is a **guideline to understand the product and context**, not a rigid rulebook.

The developer (me) may:
- Change architecture decisions
- Simplify implementations
- Override any pattern when needed

👉 Your role (Copilot) is to **assist intelligently**, not enforce this as absolute truth.

---

## 🧠 Product Vision

Dealer Desk is a **multi-tenant SaaS platform** where:

- Multiple dealers (tenants) manage their inventory
- Each dealer has:
  - A private admin panel
  - A public website
- Data is logically isolated per tenant

---

## 🏗️ Architectural Direction (NOT STRICT)

Current direction:

- Backend:
  - Node.js + Express
  - Sequelize + PostgreSQL

- Deployment:
  - VPS (cost-efficient)
  - Docker (optional but preferred)

- Images:
  - Cloudinary

---

## 🌐 FUTURE ARCHITECTURE (IMPORTANT CONTEXT)

The system is expected to evolve into:

### API Gateway + Microservices

Possible structure:

- API Gateway (entry point)
- Auth Service
- Listings Service
- Media Service
- Tenant/System Service

⚠️ IMPORTANT:
- This is a **future direction**, not current requirement
- Do NOT over-engineer prematurely
- Prefer simple solutions unless explicitly asked

---

## 🧩 Multi-Tenant Concept

- Each dealer = `system`
- Data is scoped by `system_id`

⚠️ However:
- Do NOT force multi-tenant complexity if not needed in a specific task
- Use it when relevant

---

## 👤 Roles (Flexible)

- super_admin
- owner
- staff

Rules may evolve over time.

Do NOT assume they are immutable.

---

## 🚘 Listings Concept

Listings represent vehicles.

Possible attributes:
- make
- model
- year
- mileage
- price

States:
- publish_status: draft | published
- sale_status: available | sold | unavailable

⚠️ These can change. Treat them as current idea, not fixed schema.

---

## 🧱 Coding Philosophy

Preferred (but NOT mandatory):

- Clean architecture
- Separation of concerns
- Service layer pattern

BUT:

👉 Simplicity > Overengineering  
👉 Clarity > Abstraction  

---

## ❌ What NOT to do

- Do NOT blindly enforce patterns
- Do NOT assume everything must be microservices
- Do NOT add unnecessary complexity
- Do NOT block solutions because they don't match this document

---

## ✅ What TO do

- Adapt to the current request
- Suggest improvements when useful
- Keep code clean and understandable
- Balance between:
  - good practices
  - practical implementation

---

## 🧠 Copilot Behavior

When generating code:

- Understand intent first
- Do not assume full system is already implemented
- Do not enforce architecture unless explicitly requested
- Prefer working, clear solutions over “perfect” ones

---

## 📌 Final Principle

This project is evolving.

👉 Treat this as CONTEXT, not CONSTRAINT.
👉 Assist, don't restrict.