import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

// Efeito colateral global do dayjs: garante "Agosto de 2026" em vez de "August".
// Importado por quem formata datas por extenso.
dayjs.locale('pt-br');
