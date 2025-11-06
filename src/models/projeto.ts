import prisma from '../db/index.ts';

export interface ProjetoData {
  obraId: string;
  areaId: string;
  profissionalId?: string;
  status?: string;
  dataInicio?: Date;
  dataTermino?: Date;
  observacoes?: string;
  dados?: string;
}

export class ProjetoModel {
  static async criar(data: ProjetoData) {
    return await prisma.projeto.create({
      data,
      include: {
        obra: true,
        area: true,
        profissional: true,
      },
    });
  }

  static async buscarPorId(id: string) {
    return await prisma.projeto.findUnique({
      where: { id },
      include: {
        obra: { include: { cliente: true } },
        area: true,
        profissional: true,
        acessos: true,
      },
    });
  }

  static async buscarPorObraEArea(obraId: string, areaId: string) {
    return await prisma.projeto.findFirst({
      where: { obraId, areaId },
      include: {
        obra: true,
        area: true,
        profissional: true,
      },
    });
  }

  static async listarPorObra(obraId: string) {
    return await prisma.projeto.findMany({
      where: { obraId },
      include: {
        area: true,
        profissional: true,
      },
    });
  }

  static async atualizar(id: string, data: Partial<ProjetoData>) {
    return await prisma.projeto.update({
      where: { id },
      data,
    });
  }

  static async registrarAcesso(projetoId: string, usuarioId: string, nome: string, acao: string) {
    return await prisma.acesso.create({
      data: {
        projetoId,
        usuarioId,
        nome,
        acao,
      },
    });
  }

  static async deletar(id: string) {
    return await prisma.projeto.delete({
      where: { id },
    });
  }
}

