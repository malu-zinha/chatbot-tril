import prisma from '../db';

export interface ObraData {
  nome: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  status?: string;
  dataInicio?: Date;
  dataTermino?: Date;
  clienteId: string;
}

export class ObraModel {
  static async criar(data: ObraData) {
    return await prisma.obra.create({
      data,
      include: { cliente: true, projetos: true },
    });
  }

  static async buscarPorId(id: string) {
    return await prisma.obra.findUnique({
      where: { id },
      include: {
        cliente: true,
        projetos: {
          include: {
            area: true,
            profissional: true,
          },
        },
      },
    });
  }

  static async listarPorCliente(clienteId: string) {
    return await prisma.obra.findMany({
      where: { clienteId },
      include: { projetos: true },
    });
  }

  static async listarTodas() {
    return await prisma.obra.findMany({
      include: {
        cliente: true,
        projetos: true,
      },
    });
  }

  static async atualizar(id: string, data: Partial<ObraData>) {
    return await prisma.obra.update({
      where: { id },
      data,
    });
  }

  static async deletar(id: string) {
    return await prisma.obra.delete({
      where: { id },
    });
  }
}

