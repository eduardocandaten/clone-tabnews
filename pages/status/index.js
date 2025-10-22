import useSWR from "swr";

async function fetchAPI(key) {
  const response = await fetch(key);
  const responseBody = await response.json();

  return responseBody;
}

export default function StatusPage() {
  return (
    <>
      <h1>Status</h1>
      <UpdatedAt />

      <h2>Banco de Dados</h2>
      <DatabaseInfo />
    </>
  );
}

function UpdatedAt() {
  const { isLoading, data } = useSWR("/api/v1/status", fetchAPI, {
    refreshInterval: 2000,
  });
  let updatedAtText = "Carregando...";

  if (!isLoading && data) {
    updatedAtText = new Date(data.updated_at).toLocaleString("pt-BR");
  }

  return <div>Última atualização: {updatedAtText}</div>;
}

function DatabaseInfo() {
  const { isLoading, data } = useSWR("/api/v1/status", fetchAPI, {
    refreshInterval: 2000,
  });

  let database;

  if (!isLoading && data) {
    database = data.dependencies.database;
  }

  return (
    <div>
      {isLoading ? (
        "Carregando..."
      ) : (
        <>
          <div>Versão do Postgres: {database.version}</div>
          <div>Máximo de Conexões: {database.max_connections}</div>
          <div>Conexões Abertas: {database.opened_connections}</div>
        </>
      )}
    </div>
  );
}
