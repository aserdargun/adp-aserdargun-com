import {expect,it} from 'vitest';
import {validateCatalog} from '@aserdargun/lab-core';
import {manifest,experiments,guidedLesson,initialRoute} from '../src/ils/catalog';
import concepts from '../src/ils/concepts.json';
import {scenarios,lessons} from '../src/lessons/lessons';
import {defaultConfig} from '../src/core/models';
it('maps authored presets, editable state and existing guide without fabricating evidence',()=>{
 expect(validateCatalog(manifest,experiments,[guidedLesson],concepts.map(c=>c.id))).toEqual([]);
 expect(experiments.map(e=>e.id)).toEqual([...scenarios.map(s=>s.id),'custom']);
 expect(guidedLesson.steps.map(s=>s.explanation)).toEqual(lessons.map(c=>c.body));
 expect(manifest.evidence.find(e=>e.id==='learning')?.kind).toBe('simulated');
 expect(manifest.evidence.some(e=>e.verificationStatus==='verified')).toBe(false);
});
it('initializes the actual configuration from allowlisted presets only',()=>{
 for(const s of scenarios)expect(initialRoute('?scenario='+s.id).config).toEqual({...defaultConfig,...s.patch});
 expect(initialRoute('?scenario=constructor&ils=not-json').config).toEqual(defaultConfig);
 expect(initialRoute('?scenario=overfit&lesson=adaptation-101').scenario).toBe('domain');
});
