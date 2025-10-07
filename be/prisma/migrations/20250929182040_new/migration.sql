/*
  Warnings:

  - You are about to drop the `Chunk` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Story` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Chunk" DROP CONSTRAINT "Chunk_storyId_fkey";

-- DropTable
DROP TABLE "public"."Chunk";

-- DropTable
DROP TABLE "public"."Story";

-- CreateTable
CREATE TABLE "public"."Essays" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "content" TEXT NOT NULL,

    CONSTRAINT "Essays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Hyperlinks" (
    "id" SERIAL NOT NULL,
    "essayId" INTEGER NOT NULL,

    CONSTRAINT "Hyperlinks_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Hyperlinks" ADD CONSTRAINT "Hyperlinks_essayId_fkey" FOREIGN KEY ("essayId") REFERENCES "public"."Essays"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
