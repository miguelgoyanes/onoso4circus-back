import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ActualizarInvitadoDto, CrearInvitadoDto } from './boda.dto';

describe('DTO de invitados de la boda', () => {
  it('los apellidos pueden ir vacíos al editar', async () => {
    const dto = plainToInstance(ActualizarInvitadoDto, {
      nombre: 'Edgar',
      apellidos: '',
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('se puede crear un invitado solo con el nombre', async () => {
    const dto = plainToInstance(CrearInvitadoDto, {
      grupoId: '3f2b1c0e-5d4a-4b7e-9c1d-2a3b4c5d6e7f',
      nombre: 'Edgar',
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('el nombre sigue siendo obligatorio', async () => {
    const dto = plainToInstance(ActualizarInvitadoDto, { nombre: '' });
    expect(await validate(dto)).toHaveLength(1);
  });
});
