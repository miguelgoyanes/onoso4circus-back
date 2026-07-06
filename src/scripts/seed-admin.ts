import 'dotenv/config';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { Rol } from '../auth/domain/usuario';
import { UsuarioOrmEntity } from '../auth/infrastructure/orm/usuario.orm-entity';

const SALT_ROUNDS = 10;

async function main(): Promise<void> {
  const [, , email, password, nombre] = process.argv;
  if (!email || !password || !nombre) {
    console.error('Uso: npm run seed:admin -- <email> <password> <nombre>');
    process.exitCode = 1;
    return;
  }
  if (password.length < 8) {
    console.error('La contraseña debe tener al menos 8 caracteres.');
    process.exitCode = 1;
    return;
  }

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [UsuarioOrmEntity],
  });
  await dataSource.initialize();

  try {
    const repo = dataSource.getRepository(UsuarioOrmEntity);
    const existente = await repo.findOneBy({ email });
    if (existente) {
      console.error(`Ya existe un usuario con el email ${email}.`);
      process.exitCode = 1;
      return;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await repo.save(
      repo.create({ id: randomUUID(), nombre, email, passwordHash, rol: Rol.ADMIN, activo: true }),
    );
    console.log(`ADMIN creado correctamente: ${email}`);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error) => {
  console.error('Error al crear el ADMIN inicial:', error);
  process.exitCode = 1;
});
