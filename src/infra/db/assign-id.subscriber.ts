import type { EntitySubscriberInterface, InsertEvent, ObjectLiteral } from "typeorm";
import { EventSubscriber } from "typeorm";
import { newId } from "./id";

@EventSubscriber()
export class AssignIdSubscriber implements EntitySubscriberInterface<ObjectLiteral> {
  beforeInsert(event: InsertEvent<ObjectLiteral>): void {
    const idColumn = event.metadata.columns.find((c) => c.propertyName === "id");
    if (!idColumn || idColumn.type !== "varchar") return;

    const entity = event.entity;
    if (entity && !entity.id) {
      entity.id = newId();
    }
  }
}
