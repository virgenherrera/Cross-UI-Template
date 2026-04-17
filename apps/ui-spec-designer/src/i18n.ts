import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enJson from "../../../shared/locales/en.json";
import esJson from "../../../shared/locales/es.json";

await i18n.use(initReactI18next).init({
  resources: {
    en: { translation: enJson },
    es: { translation: esJson },
  },
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
