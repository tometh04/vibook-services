#!/bin/bash

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧠 PROBANDO CEREBRO - Test Exhaustivo"
echo "======================================"
echo ""

# Array de preguntas
preguntas=(
  "¿Cuántas operaciones hay en total?"
  "¿Cuántos clientes tengo?"
  "¿Cuántas leads hay?"
  "¿Cuántas ventas tuve este mes?"
  "¿Qué viajes salen esta semana?"
  "¿Qué pagos de clientes están pendientes?"
  "¿Cuál es el balance de las cuentas?"
  "Dame un resumen del estado de la agencia"
)

success_count=0
fail_count=0

for i in "${!preguntas[@]}"; do
  num=$((i+1))
  pregunta="${preguntas[$i]}"
  
  echo -e "${YELLOW}[$num/${#preguntas[@]}] Pregunta:${NC} $pregunta"
  
  response=$(curl -s -X POST http://localhost:3044/api/ai \
    -H "Content-Type: application/json" \
    -H "Cookie: $(cat .test_cookie 2>/dev/null || echo '')" \
    -d "{\"message\": \"$pregunta\"}")
  
  # Extraer respuesta
  answer=$(echo "$response" | jq -r '.response // .error // "ERROR"')
  
  # Verificar si tiene datos reales o es genérico
  if echo "$answer" | grep -qi "no pude\|problema\|error\|contactá"; then
    echo -e "${RED}❌ FALLÓ${NC}: $answer"
    ((fail_count++))
  else
    echo -e "${GREEN}✅ OK${NC}: ${answer:0:150}..."
    ((success_count++))
  fi
  
  echo ""
  sleep 2
done

echo "======================================"
echo -e "Resultado: ${GREEN}$success_count OK${NC} / ${RED}$fail_count FAIL${NC}"
echo "======================================"
