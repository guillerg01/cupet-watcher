import type { EntitySubscriberInterface, InsertEvent, ObjectLiteral } from "typeorm";
import { EventSubscriber } from "typeorm";
import { newId } from "./id";

@EventSubscriber()
export class AssignIdSubscriber implements EntitySubscriberInterface<ObjectLiteral> {
  beforeInsert(event: InsertEvent<ObjectLiteral>): void {
    const entity = event.entity;
    if (!entity || entity.id) return;

    const idColumn = event.metadata.columns.find((c) => c.propertyName === "id");
    if (!idColumn) return;

    const t = idColumn.type;
    const isIntId =
      t === Number ||
      t === "int" ||
      t === "integer" ||
      t === "bigint" ||
      (typeof t === "function" && t.name === "Number");
    if (isIntId) return;

    entity.id = newId();
  }
}
