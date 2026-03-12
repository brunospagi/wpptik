import { QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addIndex("ContactListItems", ["contactListId", "number"], {
      name: "contactlistitems_listid_number_unique",
      unique: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeIndex("ContactListItems", "contactlistitems_listid_number_unique");
  }
};
