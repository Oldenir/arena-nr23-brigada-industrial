/**
 * Configuração central de branding da plataforma.
 *
 * Este é o ÚNICO arquivo que precisa ser alterado para personalizar a
 * identidade visual da plataforma para outra empresa. Todos os textos,
 * cores, logos e módulos exibidos na interface derivam daqui.
 *
 * Não espalhe valores fixos de identidade pelo restante do código:
 * adicione-os aqui e consuma via `platformConfig` / atributos `data-brand-*`.
 *
 * O helper `assets/js/branding.js` lê este objeto e aplica os valores nas
 * páginas automaticamente (textos, título da aba, logo, favicon, foto do
 * instrutor, variáveis CSS e módulos habilitados).
 *
 * @typedef {Object} PlatformCompany
 * @property {string} name      Nome completo da empresa/plataforma.
 * @property {string} shortName Nome curto, usado em cabeçalhos compactos.
 * @property {string} subtitle  Subtítulo do curso exibido sob o nome.
 * @property {string} logo      Caminho da logo (local, sem CDN).
 * @property {string} favicon   Caminho do favicon (local, sem CDN).
 *
 * @typedef {Object} PlatformInstructor
 * @property {string} name  Nome do instrutor exibido no cabeçalho.
 * @property {string} role  Cargo exibido abaixo do nome.
 * @property {string} photo Caminho da foto do instrutor (local, sem CDN).
 *
 * @typedef {Object} PlatformTheme
 * @property {string} primaryColor    Cor primária (destaques/ações).
 * @property {string} secondaryColor  Cor secundária (painéis).
 * @property {string} accentColor     Cor de acento (alertas/ênfase).
 * @property {string} backgroundColor Cor de fundo base.
 * @property {string} textColor       Cor de texto padrão.
 *
 * @typedef {Object} PlatformModules
 * @property {boolean} nr23     Exibe o módulo Brigada Industrial (NR 23).
 * @property {boolean} firstAid Exibe o módulo Primeiros Socorros.
 *
 * @typedef {Object} PlatformConfig
 * @property {PlatformCompany} company
 * @property {PlatformInstructor} instructor
 * @property {PlatformTheme} theme
 * @property {{ text: string }} footer
 * @property {string} locale
 * @property {PlatformModules} modules
 */

/** @type {PlatformConfig} */
export const platformConfig = {
  company: {
    name: "ARENA SL TREINAMENTOS",
    shortName: "ARENA SL",
    subtitle: "NR 23 - BRIGADA INDUSTRIAL",
    logo: "/assets/images/arena-shield.svg",
    favicon: "/assets/images/favicon.ico"
  },

  instructor: {
    name: "OLDENIR",
    role: "Instrutor",
    photo: "/assets/images/instructor-default.jpg"
  },

  theme: {
    primaryColor: "#ffcf3f",
    secondaryColor: "#20262f",
    accentColor: "#e53b34",
    backgroundColor: "#0f1318",
    textColor: "#ffffff"
  },

  footer: {
    text: "ARENA SL TREINAMENTOS"
  },

  locale: "pt-BR",

  modules: {
    nr23: true,
    firstAid: true
  }
};

export default platformConfig;
