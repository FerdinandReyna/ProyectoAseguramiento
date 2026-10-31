// Pruebas unitarias del componente FavButton.
// Dobles de prueba: mock del contexto de autenticación (useAuth) y del servicio toggleFav,
// para probar el componente sin proveedor de contexto real ni llamadas HTTP.
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import FavButton from "../components/FavButton/FavButton";
import { useAuth } from "../context/AuthContext";
import toggleFav from "../services/toggleFav";

vi.mock("../context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("../services/toggleFav", () => ({ default: vi.fn() }));

beforeEach(() => vi.resetAllMocks());

it("muestra el contador de favoritos", () => {
  useAuth.mockReturnValue({ headers: null, isAuth: false });
  render(<FavButton favorited={false} favoritesCount={4} slug="a" />);
  expect(screen.getByRole("button")).toHaveTextContent("( 4 )");
});

it("pide iniciar sesión y no llama al servicio si el usuario es visitante (RF-16)", () => {
  useAuth.mockReturnValue({ headers: null, isAuth: false });
  const alertStub = vi.spyOn(window, "alert").mockImplementation(() => {});
  render(<FavButton favorited={false} favoritesCount={0} slug="a" />);

  fireEvent.click(screen.getByRole("button"));

  expect(alertStub).toHaveBeenCalledWith("You need to login first");
  expect(toggleFav).not.toHaveBeenCalled();
});

it("llama a toggleFav y entrega el artículo actualizado al handler", async () => {
  const headers = { Authorization: "Token t" };
  useAuth.mockReturnValue({ headers, isAuth: true });
  toggleFav.mockResolvedValue({ favorited: true, favoritesCount: 1 });
  const handler = vi.fn();
  render(<FavButton favorited={false} favoritesCount={0} slug="a" handler={handler} />);

  fireEvent.click(screen.getByRole("button"));

  await waitFor(() => expect(handler).toHaveBeenCalledWith({ favorited: true, favoritesCount: 1 }));
  expect(toggleFav).toHaveBeenCalledWith({ slug: "a", favorited: false, headers });
});

it("aplica el estilo activo cuando el artículo ya es favorito", () => {
  useAuth.mockReturnValue({ headers: null, isAuth: true });
  render(<FavButton favorited favoritesCount={1} slug="a" />);
  expect(screen.getByRole("button")).toHaveClass("active");
});
