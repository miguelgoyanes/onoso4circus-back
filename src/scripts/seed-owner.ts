import 'dotenv/config';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { Rol } from '../auth/domain/usuario';
import { USERNAME_REGEX } from '../auth/domain/username';
import { UsuarioOrmEntity } from '../auth/infrastructure/orm/usuario.orm-entity';

const SALT_ROUNDS = 10;

async function main(): Promise<void> {
  const [, , username, password, nombre] = process.argv;
  if (!username || !password || !nombre) {
    console.error('Uso: npm run seed:owner -- <username> <password> <nombre>');
    process.exitCode = 1;
    return;
  }
  if (!USERNAME_REGEX.test(username)) {
    console.error('El usuario solo puede contener minúsculas, números y guiones.');
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

    const ownerExistente = await repo.findOneBy({ rol: Rol.OWNER });
    if (ownerExistente) {
      console.error(
        `Ya existe un OWNER (${ownerExistente.username}) — solo puede haber uno. No se crea otro.`,
      );
      process.exitCode = 1;
      return;
    }

    const existente = await repo.findOneBy({ username });
    if (existente) {
      console.error(`Ya existe un usuario con el username ${username}.`);
      process.exitCode = 1;
      return;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await repo.save(
      repo.create({
        id: randomUUID(),
        nombre,
        username,
        passwordHash,
        rol: Rol.OWNER,
        activo: true,
      }),
    );
    console.log(`OWNER creado correctamente: ${username}`);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error) => {
  console.error('Error al crear el OWNER inicial:', error);
  process.exitCode = 1;
});
