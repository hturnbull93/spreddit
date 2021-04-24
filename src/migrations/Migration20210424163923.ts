import { Migration } from "@mikro-orm/migrations";

export class Migration20210424163923 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      'alter table "user" rename column "password_digest" to "password";',
    );
  }
}
