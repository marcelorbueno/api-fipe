// src/routes/patrimony.ts
import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { patrimonyService } from '../services/patrimony-service'

// Schemas de validação
const getUserPatrimonyParamsSchema = z.object({
  userId: z.string().uuid(),
})

export async function patrimonyRoutes(app: FastifyInstance) {
  // GET /patrimony/user/:userId - Patrimônio de um usuário específico
  app.get('/patrimony/user/:userId', async (req, res) => {
    await authenticate(req, res)

    try {
      const { userId } = getUserPatrimonyParamsSchema.parse(req.params)

      const patrimony = await patrimonyService.calculateUserPatrimony(userId)

      return res.send({
        data: patrimony,
        message: `Patrimônio calculado para ${patrimony.user_name}`,
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'User not found') {
        return res.status(404).send({ error: 'Usuário não encontrado' })
      }

      return res.status(500).send({
        error: 'Erro ao calcular patrimônio do usuário',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })

  // GET /patrimony/partners - Patrimônio de todos os sócios
  app.get('/patrimony/partners', async (req, res) => {
    await authenticate(req, res)

    try {
      const partnersPatrimony =
        await patrimonyService.calculateAllPartnersPatrimony()

      const summary = {
        total_partners: partnersPatrimony.length,
        total_patrimony:
          partnersPatrimony.reduce((sum, partner) =>
            sum + partner.total_patrimony, 0),
        average_patrimony: partnersPatrimony.length > 0
          ? partnersPatrimony.reduce(
            (sum, partner) => sum + partner.total_patrimony, 0) /
            partnersPatrimony.length
          : 0,
      }

      return res.send({
        data: partnersPatrimony,
        summary,
        message: `Patrimônio calculado para ${partnersPatrimony.length} sócios`,
      })
    } catch (error) {
      return res.status(500).send({
        error: 'Erro ao calcular patrimônio dos sócios',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })

  // GET /patrimony/investors - Patrimônio de todos os investidores
  app.get('/patrimony/investors', async (req, res) => {
    await authenticate(req, res)

    try {
      const investorsPatrimony =
        await patrimonyService.calculateAllInvestorsPatrimony()

      const summary = {
        total_investors: investorsPatrimony.length,
        total_patrimony:
          investorsPatrimony.reduce((sum, investor) =>
            sum + investor.total_patrimony, 0),
        average_patrimony: investorsPatrimony.length > 0
          ? investorsPatrimony.reduce(
            (sum, investor) => sum + investor.total_patrimony, 0) /
            investorsPatrimony.length
          : 0,
      }

      return res.send({
        data: investorsPatrimony,
        summary,
        message:
          `Patrimônio calculado para ${investorsPatrimony.length} investidores`,
      })
    } catch (error) {
      return res.status(500).send({
        error: 'Erro ao calcular patrimônio dos investidores',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })

  // GET /patrimony/company - Patrimônio da empresa (veículos da empresa)
  app.get('/patrimony/company', async (req, res) => {
    await authenticate(req, res)

    try {
      const companyPatrimony =
        await patrimonyService.calculateCompanyPatrimony()

      return res.send({
        data: companyPatrimony,
        message:
        `Patrimônio da empresa calculado: ${companyPatrimony.vehicles_count} ` +
        'veículos',
      })
    } catch (error) {
      return res.status(500).send({
        error: 'Erro ao calcular patrimônio da empresa',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })

  // GET /patrimony/report - Relatório completo de patrimônio
  app.get('/patrimony/report', async (req, res) => {
    await authenticate(req, res)

    try {
      console.log('📊 Generating complete patrimony report...')

      const report = await patrimonyService.generateCompletePatrimonyReport()

      console.log('✅ Complete patrimony report generated successfully')

      return res.send({
        data: report,
        message: 'Relatório completo de patrimônio gerado com sucesso',
        generated_at: new Date().toISOString(),
      })
    } catch (error) {
      console.error('❌ Error generating patrimony report:', error)

      return res.status(500).send({
        error: 'Erro ao gerar relatório de patrimônio',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })

  // POST /patrimony/refresh-cache - Atualizar cache FIPE de todos os veículos
  app.post('/patrimony/refresh-cache', async (req, res) => {
    await authenticate(req, res)

    try {
      console.log('🔄 Starting FIPE cache refresh...')

      const result = await patrimonyService.refreshAllVehiclesFipeCache()

      return res.send({
        data: result,
        message:
        `Cache FIPE atualizado: ${result.updated} sucessos, ${result.errors} ` +
        'erros',
      })
    } catch (error) {
      console.error('❌ Error refreshing FIPE cache:', error)

      return res.status(500).send({
        error: 'Erro ao atualizar cache FIPE',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })

  // GET /patrimony/stats - Estatísticas gerais de patrimônio
  app.get('/patrimony/stats', async (req, res) => {
    await authenticate(req, res)

    try {
      const report = await patrimonyService.generateCompletePatrimonyReport()

      const stats = {
        // Resumo geral
        total_patrimony: report.summary.total_patrimony,
        total_vehicles: report.summary.total_vehicles,

        // Breakdown por categoria
        company: {
          patrimony: report.summary.company_patrimony,
          percentage: report.summary.total_patrimony > 0
            ? (
                report.summary.company_patrimony /
                report.summary.total_patrimony) * 100
            : 0,
          vehicles_count: report.company.vehicles_count,
        },

        partners: {
          count: report.partners.length,
          personal_patrimony: report.summary.partners_personal_patrimony,
          percentage: report.summary.total_patrimony > 0
            ? (
                report.summary.partners_personal_patrimony /
                report.summary.total_patrimony) * 100
            : 0,
          average_patrimony: report.partners.length > 0
            ? report.partners.reduce((sum, p) =>
              sum + p.total_patrimony, 0) / report.partners.length
            : 0,
        },

        investors: {
          count: report.investors.length,
          patrimony: report.summary.investors_patrimony,
          percentage: report.summary.total_patrimony > 0
            ? (
                report.summary.investors_patrimony /
                report.summary.total_patrimony) * 100
            : 0,
          average_patrimony: report.investors.length > 0
            ? report.summary.investors_patrimony / report.investors.length
            : 0,
        },

        // Top performers
        top_partners: report.partners
          .sort((a, b) => b.total_patrimony - a.total_patrimony)
          .slice(0, 3)
          .map(partner => ({
            name: partner.user_name,
            patrimony: partner.total_patrimony,
            vehicles_count: partner.vehicles.length,
          })),

        top_investors: report.investors
          .sort((a, b) => b.total_patrimony - a.total_patrimony)
          .slice(0, 3)
          .map(investor => ({
            name: investor.user_name,
            patrimony: investor.total_patrimony,
            vehicles_count: investor.vehicles.length,
          })),
      }

      return res.send({
        data: stats,
        message: 'Estatísticas de patrimônio calculadas',
        calculated_at: new Date().toISOString(),
      })
    } catch (error) {
      return res.status(500).send({
        error: 'Erro ao calcular estatísticas de patrimônio',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })
}
