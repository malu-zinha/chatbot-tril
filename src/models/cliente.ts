import prisma from '../db';

export interface ClienteData {
  nome: string;
  email?: string;
  telefone?: string;
  cpfCnpj?: string;
}

export class ClienteModel {
  static async criar(data: ClienteData) {
    return await prisma.cliente.create({
      data,
    });
  }

  static async buscarPorId(id: string) {
    return await prisma.cliente.findUnique({
      where: { id },
      include: { obras: true },
    });
  }

  static async buscarPorTelefone(telefone: string) {
    return await prisma.cliente.findFirst({
      where: { telefone },
      include: { obras: true },
    });
  }

  static async listarTodos() {
    return await prisma.cliente.findMany({
      include: { obras: true },
    });
  }

  static async atualizar(id: string, data: Partial<ClienteData>) {
    return await prisma.cliente.update({
      where: { id },
      data,
    });
  }

  static async deletar(id: string) {
    return await prisma.cliente.delete({
      where: { id },
    });
  }
}

