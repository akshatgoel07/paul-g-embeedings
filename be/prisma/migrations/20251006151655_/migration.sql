/*
  Warnings:

  - A unique constraint covering the columns `[link]` on the table `Essays` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `link` to the `Essays` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Essays" ADD COLUMN     "link" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Essays_link_key" ON "public"."Essays"("link");
