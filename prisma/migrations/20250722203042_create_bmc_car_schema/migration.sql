-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('cars', 'motorcycles', 'trucks');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "num_cpf" VARCHAR(11) NOT NULL,
    "email" TEXT NOT NULL,
    "birthday" DATE NOT NULL,
    "phone_number" TEXT NOT NULL,
    "avatar" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partners" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "num_cpf" VARCHAR(11) NOT NULL,
    "email" TEXT NOT NULL,
    "birthday" DATE NOT NULL,
    "phone_number" TEXT NOT NULL,
    "avatar" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" UUID NOT NULL,
    "license_plate" VARCHAR(8) NOT NULL,
    "renavam" VARCHAR(11) NOT NULL,
    "fipe_brand_code" INTEGER NOT NULL,
    "fipe_model_code" INTEGER NOT NULL,
    "year" TEXT NOT NULL,
    "fuel_type" TEXT NOT NULL,
    "vehicle_type" "VehicleType" NOT NULL,
    "color" TEXT,
    "observations" TEXT,
    "purchase_date" TIMESTAMP(3),
    "purchase_value" DECIMAL(12,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_ownerships" (
    "id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "partner_id" UUID NOT NULL,
    "ownership_percentage" DECIMAL(5,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_ownerships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fipe_cache" (
    "id" UUID NOT NULL,
    "brand_code" INTEGER NOT NULL,
    "model_code" INTEGER NOT NULL,
    "year" TEXT NOT NULL,
    "fuel_type" TEXT NOT NULL,
    "vehicle_type" "VehicleType" NOT NULL,
    "fipe_value" DECIMAL(12,2) NOT NULL,
    "reference_month" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fipe_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_num_cpf_key" ON "users"("num_cpf");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "partners_num_cpf_key" ON "partners"("num_cpf");

-- CreateIndex
CREATE UNIQUE INDEX "partners_email_key" ON "partners"("email");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_license_plate_key" ON "vehicles"("license_plate");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_renavam_key" ON "vehicles"("renavam");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_ownerships_vehicle_id_partner_id_key" ON "vehicle_ownerships"("vehicle_id", "partner_id");

-- CreateIndex
CREATE UNIQUE INDEX "fipe_cache_brand_code_model_code_year_fuel_type_vehicle_typ_key" ON "fipe_cache"("brand_code", "model_code", "year", "fuel_type", "vehicle_type");

-- AddForeignKey
ALTER TABLE "vehicle_ownerships" ADD CONSTRAINT "vehicle_ownerships_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_ownerships" ADD CONSTRAINT "vehicle_ownerships_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
