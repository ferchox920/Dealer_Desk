// ============================================================================
// helpers.entity.js
//
// Funciones auxiliares que usan TODAS las entidades para construir queries SQL
// parametrizadas de forma segura. Son el equivalente a lo que Sequelize hacía
// internamente cuando escribías Model.create(), Model.update(), etc.
//
// Concepto clave — Queries parametrizadas ($1, $2, ...):
//   En vez de meter valores directos en el SQL (vulnerable a inyección),
//   usamos placeholders como $1, $2, etc. y pasamos los valores aparte.
//   PostgreSQL los sustituye de forma segura.
//
//   Ejemplo: query('SELECT * FROM users WHERE id = $1', ['abc-123'])
//   En Sequelize esto era automático. Aquí lo hacemos manual pero seguro.
// ============================================================================

// Adjunta métodos (.update(), .destroy()) a un registro devuelto por la DB.
// Los define como no-enumerables para que no aparezcan al serializar a JSON.
//
// Esto permite hacer: const product = await Product.findByPk(id); await product.update({...});
// Similar a como funcionaba en Sequelize donde los registros venían con métodos.
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

// Convierte un objeto JS en las piezas necesarias para un INSERT parametrizado.
//
// Entrada: { email: 'a@b.com', role: 'staff' }
// Salida:
//   columns:      ['email', 'role']           → los nombres de columnas
//   values:       ['a@b.com', 'staff']        → los valores reales (van como params)
//   placeholders: ['$1', '$2']                → los placeholders para el SQL
//
// Se usa así en el INSERT:
//   INSERT INTO admins (email, role) VALUES ($1, $2)
//   con params: ['a@b.com', 'staff']
//
// En Sequelize esto era: Admin.create({ email: 'a@b.com', role: 'staff' })
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

// Helper simple: genera un placeholder como "$3" a partir de un índice.
function buildPlaceholder(index) {
  return `$${index}`;
}

// Construye la parte WHERE de un SELECT/UPDATE/DELETE con condiciones "campo = valor".
// Junta varias condiciones con AND.
//
// Entrada: { id: 'abc', product_id: '123' }, startIndex = 1
// Salida:
//   clause: 'id = $1 AND product_id = $2'
//   values: ['abc', '123']
//
// startIndex permite comenzar los placeholders en otro número (útil cuando ya tienes
// otros params antes del WHERE, como en un UPDATE que combina SET + WHERE).
//
// En Sequelize esto era: Model.findAll({ where: { id: 'abc', product_id: '123' } })
function buildWhereEqualsClause(filters, startIndex = 1) {
  const entries = Object.entries(filters).filter(([, value]) => value !== undefined);

  return {
    clause: entries.map(([column], index) => `${column} = ${buildPlaceholder(startIndex + index)}`).join(' AND '),
    values: entries.map(([, value]) => value),
  };
}

// Construye el bloque SET de un UPDATE usando solo los campos presentes.
//
// Entrada: { brand: 'Toyota', price: 25000 }, startIndex = 1
// Salida:
//   clause: 'brand = $1, price = $2'
//   values: ['Toyota', 25000]
//
// Se usa así en el UPDATE:
//   UPDATE products SET brand = $1, price = $2, updated_at = NOW() WHERE id = $3
//   con params: ['Toyota', 25000, 'abc-123']
//
// En Sequelize esto era: product.update({ brand: 'Toyota', price: 25000 })
function buildUpdateSetClause(data, startIndex = 1) {
  const entries = Object.entries(data).filter(([, value]) => value !== undefined);

  return {
    clause: entries.map(([column], index) => `${column} = ${buildPlaceholder(startIndex + index)}`).join(', '),
    values: entries.map(([, value]) => value),
  };
}

export { attachRecordMethods, buildInsertParts, buildPlaceholder, buildUpdateSetClause, buildWhereEqualsClause };
