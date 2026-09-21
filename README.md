# Bookora Backend

This is the backend API for the Bookora bookstore application. It provides authentication, user management, book catalog operations, cart and order flows, payment handling with Stripe, email verification, and admin features.

## Tech Stack

- Node.js
- Express.js
- MongoDB with Mongoose
- JWT authentication
- Stripe for payments
- Cloudinary for image uploads
- Resend for email delivery
- Upstash Redis for rate limiting
- Helmet, CORS, cookie parser, and validation middleware

## Features

- User signup, login, OTP verification, and password reset flow
- JWT access and refresh session support
- Book management and category management
- Cart management
- Order creation and tracking
- Stripe checkout and webhook payment processing
- Admin dashboard APIs for managing books, users, categories, payments, and orders
- Cloudinary image upload integration
- Request rate limiting when Upstash is configured
- Health check endpoint for server monitoring

## Project Structure

```bash
backend/
├── src/
│   ├── app.js
│   ├── server.js
│   ├── config/
│   ├── controllers/
│   ├── jobs/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   └── validators/
├── package.json
├── README.md
├── .env.example
└── .gitignore
```

## Prerequisites

Before running the backend, make sure you have:

- Node.js 18+ installed
- MongoDB database running or a MongoDB Atlas connection string
- Stripe account and secret keys
- Cloudinary account and credentials
- Resend account and API key
- Upstash Redis credentials (optional but recommended)

## Installation

1. Open the backend folder:

```bash
cd backend
```

2. Install dependencies:

```bash
npm install
```

3. Create a local environment file:

```bash
cp .env.example .env
```

4. Fill in your environment variables in `.env`.

5. Start the server in development mode:

```bash
npm run dev
```

6. Or start the production-style server:

```bash
npm start
```

The backend will run on:

- Local: http://localhost:5000
- Health check: http://localhost:5000/health

## Environment Variables

Create a `.env` file with values similar to this:

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/bookora
JWT_SECRET=your_super_secret_jwt_key
COOKIE_SECRET=your_cookie_secret

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret

RESEND_KEY=your_resend_api_key
RESEND_FROM="Bookora <onboarding@resend.dev>"
ADMIN_EMAIL=admin@example.com

UPSTASH_REDIS_REST_URL=https://your-upstash-url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token

ORDER_PAYMENT_EXPIRATION_MINUTES=30
```

## Scripts

```bash
npm run dev   # run with nodemon
npm start     # run production server entry
```

## Notes for GitHub

Important:

- Do not push your real `.env` file.
- Add `.env` to `.gitignore`.
- Keep `.env.example` in the repo so others know what keys are required.
- Only upload code, not secrets or live credentials.

## GitHub Repository Description Example

Use a short backend description like this:

> Bookora backend API built with Node.js, Express, MongoDB, Stripe, Cloudinary, JWT auth, and admin management.

Or a slightly longer version:

> Backend for the Bookora bookstore app. Includes auth, cart, orders, payments, Cloudinary uploads, email flows, and admin APIs.

## Production Notes

- Set `NODE_ENV=production` in deployment environment
- Use a secure `JWT_SECRET` and `COOKIE_SECRET`
- Use HTTPS behind a reverse proxy or hosting platform
- Configure Stripe webhook URL in the Stripe dashboard
- Keep database and payment credentials in environment variables, never hardcoded in source files

## License

This project does not currently specify a custom license in the package metadata. If you are publishing to GitHub, you may want to add an appropriate license file such as MIT if that matches your project.
