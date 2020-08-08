jest.mock("../../sequelize/db");

const db = require("../../sequelize/db");
const { postgres } = require("./renderRoutes");

const mockFindOne = jest.fn();
db.getModels = () => {
  return {
    Accounts: {
      findOne: mockFindOne,
    },
  };
};
const mockResponse = {
  render: jest.fn(),
  redirect: jest.fn(),
};
const mockRequest = {
  session: {},
};

describe("Testing postgres router", () => {
  test("postgres function should call res.redirect if session is undefined", async () => {
    await postgres(mockRequest, mockResponse);
    expect(mockResponse.redirect).toHaveBeenCalled();
  });
  test("postgres function should call res.render if session user is found", async () => {
    mockRequest.session.email = "em@i.l";
    mockRequest.session.userid = 99999999;
    const userAccount = {
      dbPassword: "testdbpw",
    };
    mockFindOne.mockReturnValue(userAccount);
    await postgres(mockRequest, mockResponse);
    expect(mockResponse.render).toHaveBeenCalled();
  });
});
