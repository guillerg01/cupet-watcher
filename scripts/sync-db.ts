import "@/load-env";
import "reflect-metadata";
import { syncSchema } from "@/infra/db";

syncSchema()
  .then(() => process.stdout.write("[sync-db] Done.\n"))
  .catch((err) => {
    process.stderr.write(`[sync-db] Error: ${String(err)}\n`);
    process.exit(1);
  });
