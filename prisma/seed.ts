import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PROVINCES: Array<{ id: number; name: string }> = [
  { id: 92876, name: "PINAR DEL RÍO" },
  { id: 92877, name: "MATANZAS" },
  { id: 92878, name: "CIEGO DE ÁVILA" },
  { id: 92879, name: "ARTEMISA" },
  { id: 92880, name: "LAS TUNAS" },
  { id: 92881, name: "LA HABANA" },
  { id: 92882, name: "CIENFUEGOS" },
  { id: 92883, name: "HOLGUÍN" },
  { id: 92884, name: "SANCTI SPIRITUS" },
  { id: 92885, name: "CAMAGÜEY" },
  { id: 92886, name: "SANTIAGO DE CUBA" },
  { id: 92887, name: "GUANTÁNAMO" },
  { id: 92888, name: "GRANMA" },
  { id: 92889, name: "MAYABEQUE" },
  { id: 92890, name: "VILLA CLARA" },
  { id: 92891, name: "MUNICIPIO ESPECIAL ISLA DE LA JUVENTUD" },
];

async function main(): Promise<void> {
  console.log(`[seed] Upserting ${PROVINCES.length} provinces…`);

  for (const province of PROVINCES) {
    await prisma.province.upsert({
      where: { id: province.id },
      create: { id: province.id, name: province.name },
      update: { name: province.name },
    });
    console.log(`  ✓ ${province.id} — ${province.name}`);
  }

  console.log("[seed] Done.");
}

main()
  .catch((err) => {
    console.error("[seed] Error:", err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
