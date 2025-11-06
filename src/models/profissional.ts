import prisma from '../db/index.ts';

export interface ProfissionalData {
  nome: string;
  especialidade: string;
  telefone?: string;
  email?: string;
}

export class ProfissionalModel {
  static async criar(data: ProfissionalData) {
    return await prisma.profissional.create({
      data,
    });
  }

  static async buscarPorId(id: string) {
    return await prisma.profissional.findUnique({
      where: { id },
      include: { projetos: true },
    });
  }

  static async buscarPorEspecialidade(especialidade: string) {
    return await prisma.profissional.findMany({
      where: { especialidade },
    });
  }

  static async listarTodos() {
    return await prisma.profissional.findMany({
      include: { projetos: true },
    });
  }

  static async atualizar(id: string, data: Partial<ProfissionalData>) {
    return await prisma.profissional.update({
      where: { id },
      data,
    });
  }

  static async deletar(id: string) {
    return await prisma.profissional.delete({
      where: { id },
    });
  }
}

