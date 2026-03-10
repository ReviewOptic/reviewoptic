# ReviewOptic

An automated review generation and management platform for local service businesses.

## Overview

ReviewOptic helps service businesses (cleaning companies, plumbers, electricians, etc.) collect more 5-star reviews by sending automated review requests at the right time, filtering negative feedback privately, and tracking performance.

## Architecture

- **Frontend**: React + Vite + Wouter routing + TanStack Query + Shadcn UI
- **Backend**: Express.js + Drizzle ORM + PostgreSQL
- **Styling**: Tailwind CSS with custom design tokens

## Pages

- **Dashboard** (`/`) - Stats, recent activity, private feedback action items
- **Customers** (`/customers`) - Customer list with CRUD, status filtering, search
- **Customer Detail** (`/customers/:id`) - Full activity timeline, review history
- **Templates** (`/templates`) - Edit email/SMS/WhatsApp message templates with merge tags
- **Analytics** (`/analytics`) - Line charts, funnel, channel breakdown
- **Settings** (`/settings`) - Business info, review platform links, follow-up config, widget embed
- **Review Landing** (`/review-landing`) - Sentiment pre-screen page (public, for customers)

## Key Features

1. **Golden Hour Trigger** - Send review requests immediately after job completion
2. **Sentiment Pre-Screen** - 4-5 stars → Google/Facebook link; 1-3 stars → private feedback form
3. **Multi-Channel Support** - Email, SMS, WhatsApp
4. **Do Not Contact** - Flag customers to exclude from all future sends
5. **Customizable Templates** - Merge tags: `{{customer_name}}`, `{{business_name}}`, `{{service_type}}`, `{{review_link}}`
6. **Website Widget** - Embeddable reviews widget with configurable filters
7. **Analytics** - Requests vs reviews over time, conversion funnel, channel breakdown

## Database Schema

- `customers` - Customer records with status tracking
- `review_requests` - Tracks each request sent (channel, timing, clicks)
- `reviews` - Public reviews received
- `private_feedback` - Private negative feedback (never shown on Google)
- `activity_log` - Full audit trail of all events
- `templates` - Customizable message templates per channel
- `settings` - Business configuration (single row)

## Running

```bash
npm run dev   # Start development server (port 5000)
npm run db:push  # Sync database schema
```
