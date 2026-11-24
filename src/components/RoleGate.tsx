import { ArrowRight } from 'lucide-react';
import type { Role } from '../lib/role';
import { HeroScene, StudentScene, TeacherScene } from './Illustrations';

export function RoleGate({ onChoose }: { onChoose: (role: Role) => void }) {
  return <section className="gate" aria-labelledby="gate-title">
    <div className="gate-copy">
      <h1 id="gate-title">Seu semestre na agenda<span>.</span></h1>
      <p>Horários, planos de ensino e avaliações viram eventos no seu Google Agenda. Tudo é lido no seu aparelho e você confere antes de adicionar.</p>
    </div>
    <HeroScene className="gate-art" />
    <div className="gate-choices" role="group" aria-label="Como você usa o Semestre?">
      <button type="button" className="choice choice--student" onClick={() => onChoose('student')}>
        <StudentScene className="choice-art" />
        <span className="choice-text"><strong>Sou aluno</strong><span>Envie a grade de horários e os planos de ensino. Confira as datas e leve tudo para a sua agenda.</span></span>
        <span className="choice-go">Começar como aluno <ArrowRight size={18} /></span>
      </button>
      <button type="button" className="choice choice--teacher" onClick={() => onChoose('teacher')}>
        <TeacherScene className="choice-art" />
        <span className="choice-text"><strong>Sou professor</strong><span>Monte o plano de ensino da disciplina ou importe o seu PDF. Aulas e avaliações vão para a sua agenda.</span></span>
        <span className="choice-go">Começar como professor <ArrowRight size={18} /></span>
      </button>
    </div>
  </section>;
}
