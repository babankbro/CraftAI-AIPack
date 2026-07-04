.PHONY: up down logs migrate seed psql build-prod up-prod

up:
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f app

migrate:
	docker compose exec app npx prisma migrate dev

seed:
	docker compose exec app npx prisma db seed

psql:
	docker compose exec postgres psql -U alpr -d alpr

build-prod:
	docker compose -f docker-compose.yml -f docker-compose.prod.yml build

up-prod:
	docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
