import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1783649119732 implements MigrationInterface {
  name = 'InitialSchema1783649119732';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "service" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "description" text, "duration" integer NOT NULL, "price" numeric(10,2) NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_85a21558c006647cd76fdce044b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."booking_status_enum" AS ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "booking" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "customerName" character varying NOT NULL, "customerEmail" character varying NOT NULL, "customerPhone" character varying NOT NULL, "serviceId" uuid NOT NULL, "bookingDate" date NOT NULL, "bookingTime" TIME NOT NULL, "status" "public"."booking_status_enum" NOT NULL DEFAULT 'PENDING', "notes" text, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_49171efc69702ed84c812f33540" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_46549867814bd60a2cdb181b90" ON "booking"  ("serviceId", "bookingDate", "bookingTime") `,
    );
    await queryRunner.query(
      `CREATE TABLE "user" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking" ADD CONSTRAINT "FK_e812cafb996fae4e9636ffe294f" FOREIGN KEY ("serviceId") REFERENCES "service"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "booking" DROP CONSTRAINT "FK_e812cafb996fae4e9636ffe294f"`,
    );
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_46549867814bd60a2cdb181b90"`,
    );
    await queryRunner.query(`DROP TABLE "booking"`);
    await queryRunner.query(`DROP TYPE "public"."booking_status_enum"`);
    await queryRunner.query(`DROP TABLE "service"`);
  }
}
