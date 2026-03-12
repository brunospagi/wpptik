import { QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addIndex("Contacts", ["companyId", "city"], {
      name: "contacts_company_city_idx"
    });
    await queryInterface.addIndex("Contacts", ["companyId", "segment"], {
      name: "contacts_company_segment_idx"
    });
    await queryInterface.addIndex("Contacts", ["companyId", "situation"], {
      name: "contacts_company_situation_idx"
    });
    await queryInterface.addIndex("Contacts", ["companyId", "representativeCode"], {
      name: "contacts_company_repcode_idx"
    });
    await queryInterface.addIndex("Contacts", ["companyId", "channel"], {
      name: "contacts_company_channel_idx"
    });
    await queryInterface.addIndex("Contacts", ["companyId", "foundationDate"], {
      name: "contacts_company_foundation_idx"
    });
    await queryInterface.addIndex("Contacts", ["companyId", "dtUltCompra"], {
      name: "contacts_company_dtultcompra_idx"
    });
    await queryInterface.addIndex("Contacts", ["companyId", "vlUltCompra"], {
      name: "contacts_company_vlultcompra_idx"
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeIndex("Contacts", "contacts_company_city_idx");
    await queryInterface.removeIndex("Contacts", "contacts_company_segment_idx");
    await queryInterface.removeIndex("Contacts", "contacts_company_situation_idx");
    await queryInterface.removeIndex("Contacts", "contacts_company_repcode_idx");
    await queryInterface.removeIndex("Contacts", "contacts_company_channel_idx");
    await queryInterface.removeIndex("Contacts", "contacts_company_foundation_idx");
    await queryInterface.removeIndex("Contacts", "contacts_company_dtultcompra_idx");
    await queryInterface.removeIndex("Contacts", "contacts_company_vlultcompra_idx");
  }
};
