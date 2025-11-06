import prisma from '../db/index.ts';

export interface AreaData {
  nome: string;
  descricao?: string;
}

export class AreaModel {
  static async criar(data: AreaData) {
    return await prisma.area.create({
      data,
    });
  }

  static async buscarPorId(id: string) {
    return await prisma.area.findUnique({
      where: { id },
      include: { projetos: true },
    });
  }

  static async buscarPorNome(nome: string) {
    return await prisma.area.findUnique({
      where: { nome },
    });
  }

  static async listarTodas() {
    return await prisma.area.findMany();
  }

  static async atualizar(id: string, data: Partial<AreaData>) {
    return await prisma.area.update({
      where: { id },
      data,
    });
  }

  static async deletar(id: string) {
    return await prisma.area.delete({
      where: { id },
    });
  }
}

