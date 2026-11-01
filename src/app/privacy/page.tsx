import type { Metadata } from "next";
import Link from "next/link";
import { AdminLink } from "@/components/admin-link";

const CONTROLLER = "albisiot";
const CONTACT_EMAIL = "albividal2@gmail.com";
const LAST_UPDATED = "31 ottobre 2026";

export const metadata: Metadata = {
  title: "Informativa sulla privacy · O-MEGA",
  description: "Quali dati raccoglie O-MEGA, perché li usa e come puoi chiederne la cancellazione.",
};

function ContactLink() {
  return (
    <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold text-comic-yellow underline">
      {CONTACT_EMAIL}
    </a>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 bg-panel px-4 py-4 text-sm font-medium leading-relaxed">
      <h2 className="font-display text-xl uppercase text-comic-yellow">{title}</h2>
      {children}
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1 pl-4">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

// Static on purpose: readable without signing in, as Google requires for the consent screen.
export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-3 px-3 pb-8 pt-6">
      <header className="flex flex-col gap-1 px-1 pb-2">
        <h1 className="font-display text-4xl uppercase">Informativa sulla privacy</h1>
        <p className="text-xs font-semibold text-muted">Ultimo aggiornamento: {LAST_UPDATED}</p>
      </header>

      <Section title="Chi è il titolare">
        <p>
          Il titolare del trattamento dei dati di O-MEGA è {CONTROLLER}. Per qualsiasi domanda sui tuoi dati puoi
          scrivere a <ContactLink />.
        </p>
      </Section>

      <Section title="Quali dati raccogliamo">
        <p>Quando accedi con Google riceviamo:</p>
        <Bullets items={["indirizzo email", "nome", "immagine del profilo", "identificativo del tuo account Google"]} />
        <p>Quando giochi salviamo:</p>
        <Bullets
          items={[
            "nome utente, livello, esperienza e statistiche",
            "carte possedute, monete e relativi movimenti",
            "partite giocate, carte conquistate e perse",
            "ultima attività durante una partita",
          ]}
        />
        <p>Non chiediamo la tua posizione, non usiamo pubblicità e non vendiamo i tuoi dati.</p>
      </Section>

      <Section title="Perché li usiamo">
        <p>
          Usiamo questi dati solo per farti accedere, conservare i tuoi progressi, far funzionare le sfide contro altri
          giocatori e proteggere il gioco da abusi. La base giuridica è l&apos;esecuzione del servizio che richiedi
          registrandoti e, per la sicurezza, il legittimo interesse a mantenere il gioco corretto.
        </p>
      </Section>

      <Section title="Cosa vedono gli altri giocatori">
        <p>
          I tuoi avversari vedono nome utente, immagine del profilo, livello e carte usate in partita. La tua email non
          viene mostrata. Il nome utente iniziale è creato a partire dal tuo nome Google: puoi cambiarlo quando vuoi nella
          pagina Profilo.
        </p>
      </Section>

      <Section title="A chi affidiamo i dati">
        <Bullets
          items={[
            "Supabase: autenticazione e database del gioco.",
            "Google: accesso con il tuo account.",
            "GitHub Pages: pubblicazione del sito, che può registrare dati tecnici come l'indirizzo IP.",
          ]}
        />
        <p>
          Questi fornitori possono trattare i dati anche fuori dall&apos;Unione europea, con le garanzie previste dal GDPR.
        </p>
      </Section>

      <Section title="Dati salvati sul dispositivo">
        <p>
          Il sito non usa cookie pubblicitari o di profilazione. Nella memoria del browser salva la sessione di accesso e
          alcune preferenze di gioco, come l&apos;ultima squadra usata. Queste informazioni servono al funzionamento del
          gioco.
        </p>
      </Section>

      <Section title="Per quanto tempo li conserviamo">
        <p>
          Conserviamo i dati finché il tuo account esiste. Se chiedi la cancellazione, eliminiamo account, profilo, carte
          e partite; nel registro degli scambi di carte può restare una traccia dei trasferimenti, senza alcun
          collegamento a te.
        </p>
      </Section>

      <Section title="I tuoi diritti">
        <p>
          Puoi chiedere di accedere ai tuoi dati, correggerli, cancellarli, limitarne il trattamento, riceverne una copia
          od opporti al trattamento. Per farlo, compresa la cancellazione dell&apos;account, scrivi a <ContactLink />. Puoi
          anche presentare reclamo al Garante per la protezione dei dati personali.
        </p>
        <p>
          Puoi inoltre revocare l&apos;accesso di O-MEGA dalle impostazioni del tuo account Google.
        </p>
      </Section>

      <Section title="Minori">
        <p>
          In Italia chi ha meno di 14 anni può usare O-MEGA solo con il consenso di un genitore o di chi ne fa le veci.
        </p>
      </Section>

      <Section title="Modifiche">
        <p>Se questa informativa cambia, aggiorniamo questa pagina e la data indicata in alto.</p>
      </Section>

      <Link href="/" className="btn btn-primary mt-3">
        Torna a O-MEGA
      </Link>
      <AdminLink />
    </main>
  );
}
