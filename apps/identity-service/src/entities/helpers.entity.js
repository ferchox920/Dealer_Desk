function attachRecordMethods(record, methods) {
  if (!record) return null;

  for (const [name, method] of Object.entries(methods)) {
    Object.defineProperty(record, name, {
      value: method,
      enumerable: false,
      writable: false,
    });
  }

  return record;
}

function buildInsertParts(data) {
  const entries = Object.entries(data);
  const columns = entries.map(([column]) => column);
  const values = entries.map(([, value]) => value);
  const placeholders = entries.map((_, index) => `$${index + 1}`);

  return {
    columns,
    values,
    placeholders,
  };
}

function buildPlaceholder(index) {
  return `$${index}`;
}

function buildWhereEqualsClause(filters, startIndex = 1) {
  const entries = Object.entries(filters).filter(([, value]) => value !== undefined);

  return {
    clause: entries.map(([column], index) => `${column} = ${buildPlaceholder(startIndex + index)}`).join(' AND '),
    values: entries.map(([, value]) => value),
  };
}

function buildUpdateSetClause(data, startIndex = 1) {
  const entries = Object.entries(data).filter(([, value]) => value !== undefined);

  return {
    clause: entries.map(([column], index) => `${column} = ${buildPlaceholder(startIndex + index)}`).join(', '),
    values: entries.map(([, value]) => value),
  };
}

export { attachRecordMethods, buildInsertParts, buildPlaceholder, buildUpdateSetClause, buildWhereEqualsClause };
