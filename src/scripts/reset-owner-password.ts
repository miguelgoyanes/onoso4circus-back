import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { Rol } from '../auth/domain/usuario';
import { UsuarioOrmEntity } from '../auth/infrastructure/orm/usuario.orm-entity';

const SALT_ROUNDS = 10;

async function main(): Promise<void> {
  const [, , newPassword] = process.argv;
  if (!newPassword) {
    console.error('Uso: npm run reset:owner-password -- <nuevaPassword>');
    process.exitCode = 1;
    return;
  }
  if (newPassword.length < 8) {
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

    const owner = await repo.findOneBy({ rol: Rol.OWNER });
    if (!owner) {
      console.error('No existe ningún usuario OWNER en la base de datos.');
      process.exitCode = 1;
      return;
    }

    owner.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await repo.save(owner);

    console.log(`Contraseña reseteada para el OWNER "${owner.username}".`);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error) => {
  console.error('Error al resetear la contraseña del OWNER:', error);
  process.exitCode = 1;
});
