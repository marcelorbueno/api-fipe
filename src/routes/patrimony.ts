import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { PatrimonyService } from '../services/patrimony-service'

const patrimonyService = new PatrimonyService()

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

      console.log(`📊 Calculando patrimônio para usuário: ${userId}`)

      const userPatrimony =
        await patrimonyService.calculateUserPatrimony(userId)

      return res.send({
        data: userPatrimony,
        message: `Patrimônio calculado para ${userPatrimony.user_name}`,
        breakdown: {
          total: userPatrimony.total_patrimony,
          personal_vehicles: userPatrimony.personal_vehicles_value,
          company_participation: userPatrimony.company_vehicles_value,
        },
      })
    } catch (error) {
      console.error('❌ Erro ao calcular patrimônio do usuário:', error)

      if (error instanceof Error && error.message === 'User not found') {
        return res.status(404).send({
          error: 'Usuário não encontrado',
        })
      }

      return res.status(500).send({
        error: 'Erro ao calcular patrimônio do usuário',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })

  // GET /patrimony/partners - Patrimônio dos sócios (incluindo participação na
  // empresa)
  app.get('/patrimony/partners', async (req, res) => {
    await authenticate(req, res)

    try {
      console.log('🤝 Calculando patrimônio de todos os sócios...')

      const partnersPatrimony =
        await patrimonyService.calculateAllPartnersPatrimony()

      const summary = {
        total_partners: partnersPatrimony.length,
        total_patrimony: partnersPatrimony.reduce(
          (sum, partner) => sum + partner.total_patrimony, 0),
        total_personal_patrimony: partnersPatrimony.reduce(
          (sum, partner) => sum + partner.personal_vehicles_value, 0),
        total_company_participation: partnersPatrimony.reduce(
          (sum, partner) => sum + partner.company_vehicles_value, 0),
        average_patrimony: partnersPatrimony.length > 0
          ? partnersPatrimony.reduce(
            (sum, partner) => sum + partner.total_patrimony, 0) /
            partnersPatrimony.length
          : 0,
      }

      return res.send({
        data: partnersPatrimony,
        summary,
        message:
          `Patrimônio calculado para ${partnersPatrimony.length} sócios`,
        note:
          'O patrimônio dos sócios inclui veículos pessoais + participação ' +
          'nos veículos da empresa',
      })
    } catch (error) {
      console.error('❌ Erro ao calcular patrimônio dos sócios:', error)

      return res.status(500).send({
        error: 'Erro ao calcular patrimônio dos sócios',
        details: error instanceof Error
          ? error.message
          : 'Erro desconhecido',
      })
    }
  })

  // GET /patrimony/investors - Patrimônio dos investidores
  app.get('/patrimony/investors', async (req, res) => {
    await authenticate(req, res)

    try {
      console.log('💼 Calculando patrimônio de todos os investidores...')

      const investorsPatrimony =
        await patrimonyService.calculateAllInvestorsPatrimony()

      const summary = {
        total_investors: investorsPatrimony.length,
        total_patrimony: investorsPatrimony.reduce(
          (sum, investor) => sum + investor.total_patrimony, 0),
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
      console.error('❌ Erro ao calcular patrimônio dos investidores:', error)

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
      console.log('🏢 Calculando patrimônio da empresa...')

      const companyPatrimony =
        await patrimonyService.calculateCompanyPatrimony()

      return res.send({
        data: companyPatrimony,
        message:
          'Patrimônio da empresa calculado: ' +
          `${companyPatrimony.vehicles_count} veículos`,
        breakdown: {
          total_value: companyPatrimony.total_company_patrimony,
          vehicles_count: companyPatrimony.vehicles_count,
          partners_count: companyPatrimony.partners.length,
        },
      })
    } catch (error) {
      console.error('❌ Erro ao calcular patrimônio da empresa:', error)

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
        insights: {
          company_vs_personal: {
            company_patrimony: report.summary.company_patrimony,
            partners_personal: report.summary.partners_personal_patrimony,
            partners_company_participation:
              report.summary.partners_company_participation,
            investors_patrimony: report.summary.investors_patrimony,
          },
          totals: {
            grand_total: report.summary.total_patrimony,
            total_vehicles: report.summary.total_vehicles,
          },
        },
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
          `Cache FIPE atualizado: ${result.updated} sucessos, ` +
          `${result.errors} erros`,
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
}
