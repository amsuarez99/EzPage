import { OperatorRecord, SemanticCube } from './types'

const plusRecord: OperatorRecord = {
  int: {
    int: 'int',
    float: 'float',
    string: 'Type Error',
    bool: 'Type Error',
  },
  float: {
    int: 'float',
    float: 'float',
    string: 'Type Error',
    bool: 'Type Error',
  },
  string: {
    int: 'Type Error',
    float: 'Type Error',
    string: 'string',
    bool: 'Type Error',
  },
  bool: {
    int: 'Type Error',
    float: 'Type Error',
    string: 'Type Error',
    bool: 'Type Error',
  },
}

const minusRecord: OperatorRecord = {
  int: {
    int: 'int',
    float: 'float',
    string: 'Type Error',
    bool: 'Type Error',
  },
  float: {
    int: 'float',
    float: 'float',
    string: 'Type Error',
    bool: 'Type Error',
  },
  string: {
    int: 'Type Error',
    float: 'Type Error',
    string: 'Type Error',
    bool: 'Type Error',
  },
  bool: {
    int: 'Type Error',
    float: 'Type Error',
    string: 'Type Error',
    bool: 'Type Error',
  },
}

const timesRecord: OperatorRecord = {
  int: {
    int: 'int',
    float: 'float',
    string: 'Type Error',
    bool: 'Type Error',
  },
  float: {
    int: 'float',
    float: 'float',
    string: 'Type Error',
    bool: 'Type Error',
  },
  string: {
    int: 'Type Error',
    float: 'Type Error',
    string: 'Type Error',
    bool: 'Type Error',
  },
  bool: {
    int: 'Type Error',
    float: 'Type Error',
    string: 'Type Error',
    bool: 'Type Error',
  },
}

const divideRecord: OperatorRecord = {
  int: {
    int: 'float',
    float: 'float',
    string: 'Type Error',
    bool: 'Type Error',
  },
  float: {
    int: 'float',
    float: 'float',
    string: 'Type Error',
    bool: 'Type Error',
  },
  string: {
    int: 'Type Error',
    float: 'Type Error',
    string: 'Type Error',
    bool: 'Type Error',
  },
  bool: {
    int: 'Type Error',
    float: 'Type Error',
    string: 'Type Error',
    bool: 'Type Error',
  },
}

const inequalityRecord: OperatorRecord = {
  int: {
    int: 'bool',
    float: 'bool',
    string: 'Type Error',
    bool: 'Type Error',
  },
  float: {
    int: 'bool',
    float: 'bool',
    string: 'Type Error',
    bool: 'Type Error',
  },
  string: {
    int: 'Type Error',
    float: 'Type Error',
    string: 'Type Error',
    bool: 'Type Error',
  },
  bool: {
    int: 'Type Error',
    float: 'Type Error',
    string: 'Type Error',
    bool: 'Type Error',
  },
}

const equalityRecord: OperatorRecord = {
  int: {
    int: 'bool',
    float: 'bool',
    string: 'Type Error',
    bool: 'Type Error',
  },
  float: {
    int: 'bool',
    float: 'bool',
    string: 'Type Error',
    bool: 'Type Error',
  },
  string: {
    int: 'Type Error',
    float: 'Type Error',
    string: 'bool',
    bool: 'Type Error',
  },
  bool: {
    int: 'Type Error',
    float: 'Type Error',
    string: 'Type Error',
    bool: 'bool',
  },
}

const logicalRecord: OperatorRecord = {
  int: {
    int: 'Type Error',
    float: 'Type Error',
    string: 'Type Error',
    bool: 'Type Error',
  },
  float: {
    int: 'Type Error',
    float: 'Type Error',
    string: 'Type Error',
    bool: 'Type Error',
  },
  string: {
    int: 'Type Error',
    float: 'Type Error',
    string: 'Type Error',
    bool: 'Type Error',
  },
  bool: {
    int: 'Type Error',
    float: 'Type Error',
    string: 'Type Error',
    bool: 'bool',
  },
}

const semanticCube: SemanticCube = {
  '+': plusRecord,
  '-': minusRecord,
  '*': timesRecord,
  '/': divideRecord,
  '<': inequalityRecord,
  '>': inequalityRecord,
  '<=': inequalityRecord,
  '>=': inequalityRecord,
  '==': equalityRecord,
  '!=': equalityRecord,
  '||': logicalRecord,
  '&&': logicalRecord,
}

export { semanticCube }
