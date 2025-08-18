// assessment-facade.service.ts
import { Injectable } from '@angular/core';
import { QuestionnaireService } from '../../../../../services/questionnaire.service';
import { Observable, of } from 'rxjs';
import { switchMap, shareReplay } from 'rxjs/operators';
import { BusinessQuestionnaire } from '../../../../../models/questionnaire.models';

type ResponsesMap = { [questionId: string]: any };

@Injectable({ providedIn: 'root' })
export class AssessmentFacade {
  private questionnaireCache$?: Observable<BusinessQuestionnaire>;

  constructor(private qs: QuestionnaireService) {}

  getQuestionnaire(): Observable<BusinessQuestionnaire> {
    if (!this.questionnaireCache$) {
      this.questionnaireCache$ = this.qs.getBusinessAssessmentQuestionnaire().pipe(shareReplay(1));
    }
    return this.questionnaireCache$;
  }

  getResponses(companyId: number): Observable<ResponsesMap> {
    return this.getQuestionnaire().pipe(
      switchMap(q =>
        q?.id
          ? this.qs.getResponse(String(companyId), q.id)
          : of(null as any)
      ),
      switchMap((resp: any) => {
        if (!resp?.section_responses) return of({});
        const map: ResponsesMap = {};
        resp.section_responses.forEach((sr: any) =>
          sr.question_responses?.forEach((qr: any) => (map[qr.question_id] = qr.value))
        );
        return of(map);
      }),
      shareReplay(1)
    );
  }
}
