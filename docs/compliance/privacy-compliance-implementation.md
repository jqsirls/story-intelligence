# Privacy Compliance Implementation
## Concrete Technical Solutions for COPPA, GDPR, UK Children's Code Compliance

### 1. Enhanced Database Schema for Privacy Compliance

```sql
-- Enhanced user table with privacy compliance fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS data_purposes JSONB DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS consent_history JSONB DEFAULT '[]';
ALTER TABLE users ADD COLUMN IF NOT EXISTS age_verification_method TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS age_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_preferences JSONB DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS parental_verification_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS parental_verification_expires_at TIMESTAMPTZ;

-- Data purposes registry
CREATE TABLE data_purposes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purpose_name TEXT NOT NULL UNIQUE,
  legal_basis TEXT NOT NULL, -- 'consent', 'legitimate_interest', 'contract', etc.
  description TEXT NOT NULL,
  child_appropriate BOOLEAN DEFAULT FALSE,
  retention_period INTERVAL NOT NULL,
  data_categories TEXT[] NOT NULL, -- ['emotional_data', 'story_content', etc.]
  processing_activities TEXT[] NOT NULL,
  third_party_sharing BOOLEAN DEFAULT FALSE,
  automated_decision_making BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Granular consent management
CREATE TABLE consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users NOT NULL,
  purpose_id UUID REFERENCES data_purposes NOT NULL,
  consent_given BOOLEAN NOT NULL,
  consent_method TEXT NOT NULL, -- 'voice', 'app', 'web', 'parental'
  parent_consent BOOLEAN DEFAULT FALSE,
  consent_timestamp TIMESTAMPTZ DEFAULT NOW(),
  withdrawal_timestamp TIMESTAMPTZ,
  withdrawal_method TEXT,
  legal_basis TEXT NOT NULL,
  consent_string TEXT, -- For audit trail
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  expires_at TIMESTAMPTZ, -- For time-limited consent
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Age verification records
CREATE TABLE age_verification_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users NOT NULL,
  verification_method TEXT NOT NULL, -- 'self_declaration', 'parental_confirmation', 'id_verification'
  verified_age INTEGER,
  verification_data JSONB, -- Encrypted verification details
  verification_status TEXT DEFAULT 'pending', -- 'pending', 'verified', 'failed', 'expired'
  verifier_id TEXT, -- Parent or guardian ID
  verification_timestamp TIMESTAMPTZ DEFAULT NOW(),
  expiry_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Parental consent workflow
CREATE TABLE parental_consent_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_user_id UUID REFERENCES users NOT NULL,
  parent_email TEXT NOT NULL,
  verification_token TEXT NOT NULL,
  consent_scope JSONB NOT NULL, -- What permissions are being requested
  request_timestamp TIMESTAMPTZ DEFAULT NOW(),
  response_timestamp TIMESTAMPTZ,
  consent_given BOOLEAN,
  verification_method TEXT, -- 'email', 'sms', 'video_call', 'id_verification'
  verification_data JSONB, -- Encrypted verification details
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'denied', 'expired'
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purpose-based access tokens
CREATE TABLE purpose_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users NOT NULL,
  token_hash TEXT NOT NULL,
  purposes UUID[] NOT NULL, -- Array of purpose IDs
  data_scope JSONB NOT NULL, -- What data can be accessed
  restrictions JSONB DEFAULT '{}', -- Age-based or other restrictions
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data processing audit trail
CREATE TABLE data_processing_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users,
  purpose_id UUID REFERENCES data_purposes NOT NULL,
  processing_activity TEXT NOT NULL,
  data_categories TEXT[] NOT NULL,
  legal_basis TEXT NOT NULL,
  consent_id UUID REFERENCES consent_records,
  data_subject_age INTEGER,
  automated_decision BOOLEAN DEFAULT FALSE,
  processing_timestamp TIMESTAMPTZ DEFAULT NOW(),
  retention_until TIMESTAMPTZ,
  anonymized_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default data purposes
INSERT INTO data_purposes (purpose_name, legal_basis, description, child_appropriate, retention_period, data_categories, processing_activities) VALUES
('story_creation', 'consent', 'Creating and storing personalized stories', true, INTERVAL '2 years', ARRAY['story_content', 'character_data'], ARRAY['content_generation', 'personalization']),
('emotional_analysis', 'consent', 'Analyzing emotional patterns for wellbeing insights', true, INTERVAL '1 year', ARRAY['emotional_data', 'interaction_data'], ARRAY['pattern_analysis', 'recommendation_generation']),
('voice_processing', 'consent', 'Processing voice commands and responses', true, INTERVAL '30 days', ARRAY['audio_data', 'transcript_data'], ARRAY['speech_recognition', 'response_generation']),
('parental_insights', 'legitimate_interest', 'Providing insights to parents about child development', false, INTERVAL '1 year', ARRAY['behavioral_data', 'progress_data'], ARRAY['analytics', 'reporting']),
('service_improvement', 'legitimate_interest', 'Improving service quality and features', false, INTERVAL '3 years', ARRAY['usage_data', 'performance_data'], ARRAY['analytics', 'optimization']),
('safety_monitoring', 'vital_interests', 'Monitoring for child safety and wellbeing', true, INTERVAL '7 years', ARRAY['interaction_data', 'behavioral_data'], ARRAY['risk_assessment', 'alert_generation']);

-- Enhanced retention policies
INSERT INTO data_retention_policies (table_name, retention_period, deletion_strategy) VALUES
('stories', INTERVAL '2 years', 'anonymize'),
('characters', INTERVAL '2 years', 'anonymize'),
('story_interactions', INTERVAL '1 year', 'anonymize'),
('user_preferences', INTERVAL '3 years', 'anonymize'),
('consent_records', INTERVAL '7 years', 'hard_delete'), -- Legal requirement
('age_verification_records', INTERVAL '7 years', 'hard_delete'),
('parental_consent_requests', INTERVAL '7 years', 'hard_delete'),
('data_processing_log', INTERVAL '7 years', 'anonymize');

-- Indexes for performance
CREATE INDEX idx_consent_records_user_purpose ON consent_records(user_id, purpose_id);
CREATE INDEX idx_consent_records_expires_at ON consent_records(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_age_verification_user_id ON age_verification_records(user_id);
CREATE INDEX idx_parental_consent_token ON parental_consent_requests(verification_token);
CREATE INDEX idx_parental_consent_expires_at ON parental_consent_requests(expires_at);
CREATE INDEX idx_purpose_tokens_user_id ON purpose_access_tokens(user_id);
CREATE INDEX idx_purpose_tokens_expires_at ON purpose_access_tokens(expires_at);
CREATE INDEX idx_data_processing_user_purpose ON data_processing_log(user_id, purpose_id);

-- Enable RLS on new tables
ALTER TABLE data_purposes ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE age_verification_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE parental_consent_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE purpose_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_processing_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY data_purposes_read ON data_purposes FOR SELECT USING (true); -- Public read
CREATE POLICY consent_records_policy ON consent_records FOR ALL USING (user_id = auth.uid());
CREATE POLICY age_verification_policy ON age_verification_records FOR ALL USING (user_id = auth.uid());
CREATE POLICY parental_consent_policy ON parental_consent_requests FOR ALL USING (child_user_id = auth.uid());
CREATE POLICY purpose_tokens_policy ON purpose_access_tokens FOR ALL USING (user_id = auth.uid());
CREATE POLICY data_processing_policy ON data_processing_log FOR ALL USING (user_id = auth.uid());
```

### 2. Purpose-Based Access Control Middleware

```typescript
// packages/shared-types/src/privacy/PurposeBasedAuth.ts
export interface PurposeToken {
  sub: string; // user ID
  purposes: string[]; // Array of purpose names
  dataScope: {
    allowedTables: string[];
    allowedColumns: Record<string, string[]>;
    restrictions: DataRestriction[];
  };
  ageVerified: boolean;
  parentConsent: boolean;
  isChild: boolean;
  expiresAt: number;
}

export interface DataRestriction {
  type: 'age_limit' | 'parental_approval' | 'time_limit' | 'data_minimization';
  condition: any;
  action: 'deny' | 'anonymize' | 'require_consent';
}

// packages/shared-types/src/privacy/ConsentManager.ts
export class ConsentManager {
  private supabase: SupabaseClient<Database>;
  
  async requestConsent(
    userId: string,
    purposeNames: string[],
    consentMethod: 'voice' | 'app' | 'web'
  ): Promise<ConsentResult> {
    // Check if user is COPPA-protected
    const user = await this.getUser(userId);
    if (user.is_coppa_protected && !user.parent_consent_verified) {
      return this.requestParentalConsent(userId, purposeNames);
    }
    
    // Get purpose details
    const purposes = await this.getPurposes(purposeNames);
    
    // Check if any purpose requires parental consent for this age
    const requiresParentalConsent = purposes.some(p => 
      !p.child_appropriate && user.age && user.age < 16
    );
    
    if (requiresParentalConsent) {
      return this.requestParentalConsent(userId, purposeNames);
    }
    
    // Record consent
    const consentRecords = await Promise.all(
      purposes.map(purpose => this.recordConsent(userId, purpose.id, true, consentMethod))
    );
    
    return {
      success: true,
      consentIds: consentRecords.map(c => c.id),
      requiresParentalApproval: false
    };
  }
  
  async requestParentalConsent(
    childUserId: string,
    purposeNames: string[]
  ): Promise<ConsentResult> {
    const child = await this.getUser(childUserId);
    if (!child.parent_email) {
      throw new Error('Parent email required for consent request');
    }
    
    // Create parental consent request
    const verificationToken = this.generateSecureToken();
    const consentRequest = await this.supabase
      .from('parental_consent_requests')
      .insert({
        child_user_id: childUserId,
        parent_email: child.parent_email,
        verification_token: verificationToken,
        consent_scope: { purposes: purposeNames },
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();
    
    // Send verification email to parent
    await this.sendParentalConsentEmail(child.parent_email, verificationToken, purposeNames);
    
    return {
      success: true,
      requiresParentalApproval: true,
      consentRequestId: consentRequest.data?.id,
      parentEmail: child.parent_email
    };
  }
  
  async verifyParentalConsent(
    token: string,
    consentGiven: boolean,
    verificationMethod: string
  ): Promise<void> {
    const request = await this.supabase
      .from('parental_consent_requests')
      .select('*')
      .eq('verification_token', token)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (!request.data) {
      throw new Error('Invalid or expired consent request');
    }
    
    // Update request status
    await this.supabase
      .from('parental_consent_requests')
      .update({
        response_timestamp: new Date().toISOString(),
        consent_given: consentGiven,
        verification_method: verificationMethod,
        status: consentGiven ? 'approved' : 'denied'
      })
      .eq('id', request.data.id);
    
    if (consentGiven) {
      // Record consent for each purpose
      const purposes = await this.getPurposes(request.data.consent_scope.purposes);
      await Promise.all(
        purposes.map(purpose => 
          this.recordConsent(
            request.data.child_user_id, 
            purpose.id, 
            true, 
            'parental',
            true // parent_consent = true
          )
        )
      );
      
      // Update user's parent consent status
      await this.supabase
        .from('users')
        .update({ parent_consent_verified: true })
        .eq('id', request.data.child_user_id);
    }
  }
  
  async generatePurposeToken(
    userId: string,
    requestedPurposes: string[]
  ): Promise<string> {
    // Validate user has consent for all requested purposes
    const validPurposes = await this.validateUserConsent(userId, requestedPurposes);
    
    if (validPurposes.length === 0) {
      throw new Error('No valid consents found for requested purposes');
    }
    
    const user = await this.getUser(userId);
    const purposes = await this.getPurposes(validPurposes);
    
    // Generate data scope based on purposes
    const dataScope = this.generateDataScope(purposes, user);
    
    const token: PurposeToken = {
      sub: userId,
      purposes: validPurposes,
      dataScope,
      ageVerified: !!user.age_verified_at,
      parentConsent: user.parent_consent_verified,
      isChild: user.is_coppa_protected,
      expiresAt: Date.now() + (4 * 60 * 60 * 1000) // 4 hours
    };
    
    // Store token for tracking
    const tokenHash = this.hashToken(JSON.stringify(token));
    await this.supabase
      .fions.mplicater ita transf-border daossogies and crion methodolcatverifind age arly arount, particulre deploymeiew befolegal revns require atiomentAll imple

under 16.en s for childrtectionenhanced proproviding  and es only,l purpossentia to escollectiondata nimizing ng, miessiata procnt for all din conse opt-g explicitrinby requi defaults" rivacyigh-pts "hplemenm imte
The sysparents
nisms for  mecharol and contashboardive dehens: Compr**ontrolsl C*Parenta
7. *systemsd audit  cleanup, anretention,ce**: Data ed Complianmatto. **Au
6 for minorsectioned data protnhancs and einterfacee priatappro**: Age- Protectionscific **Child-Speisms
5. mechandrawalh withtracking witsent  conledetait**: Dgemennsent Mana Costn
4. **Robuldrer chiement fo involvh parentalitfication wp verii-ste: Multication** Verifnced Agehat
3. **Ener consenposes and uspuric n specifess based o data accranularntrol**: Ged Access CoBasrpose-ts
2. **PuA requiremenCPR and ren's Code,UK ChildPA, GDPR, es COPddressliance**: Ampcy CoPrivarehensive 
1. **Compovides:
tation premen

This impl }
}
```;
 
    }
      ]        }ue
uired: tr         req
 ion', this decis notified ofwill be parents  mythatee gr'I a  label:      
   n_consent',icatiot_notifype: 'paren
          t{       },
        red: true
       requi,
    s' hourin 24withy mind ange mnd I can chersta 'I und     label:  ent',
   acknowledgm_off_lingcootype: '
            {},
            
  ruerequired: t       how',
    used and will be at datad whtandersel: 'I un        labx',
  med_checkbope: 'infor        ty     {
    
 s: [echanismonsentM   ce,
   trucation: otifiresParentalN requi
      hours/ 2460 * 1000, /24 * 60 * ffPeriod:    coolingO
   e, noticivacyNotice:',
      prted_consentassispe: '   flowTy    return {

       );
    urposes
    pe,
  d)).agser(userIis.getUit th     (awa(
 acyNoticeriendlyPrivldFenerateChiInterface.gt privacyainotice = awonst );
    crface(cyIntevahildPriew C n =faceivacyInterprst   conperiod
  ooling-off s and cexplanation enhanced , provideear olds13-15 yFor     // {
Result> ConsentFlow): Promise<
   string[]  purposes:ring,
  serId: stow(
    unsentFleAssistedConitiatasync i
  private    }
);
 esoserId, purpw(usonsentFloStandardCis.initiate return th 
   
    }
   urposes);w(userId, pentFlossistedConstiateA.inirn this
      retu16) {r.age <  use 13 &&e >=ser.ag (u
    if   }
   
  es); purposow(userId,ConsentFlntalre.initiateParn this retu    e < 13) {
 r.ag
    if (use;
    er(userId)s.getUs thiuser = awaitconst {
    wResult> Flosentise<Conromng[]
  ): Poses: stri
    purptring, s  userId:(
  FlowntChildConseiate async initentFlow {
 Conslass Child cortflow
expic consent ild-specif

// Ch
  }
};entseturn elem   r }
    
     });
   alse
  ultState: f       defa
 ent.',eative contnd creferences, aer prcharact, choicestory  your sludes savingincs: 'This      detail,
   ry_creation': 'storposepu
        nces',re your prefe based onrieszed storsonaliave peeate and scrus to ion: 'Allow pt    descri',
    izationsonalon & Per CreatiStory label: '     ,
  ggle'led_toype: 'detai
        tush({ts.p      elemen} else {

    );
      }}
        ]: false ks', valueo than label: 'N: '👎',    { emoji      ue },
', value: tr me!helpes, 'Y', label: ji: '👍mo         { es: [
  choice,
       lysis'_ana: 'emotional     purpose,
   gs?'feelinotice your e n'Should wion:     descript',
    g Helper '😊 Feelin      label:
  choice', 'emoji_ype:      t
  h({ts.pus    elemen
      
  e
      });te: falsultSta    defa  eation',
  _cre: 'story    purpos',
    e stories?elp mak het uson: 'L  descripti   
   ry Making', Sto '🎭   label:,
     _toggle'plesim  type: '({
      s.pushent    elem {
  od')holy_child= 'earroup ==f (ageG
    
    ient[] = [];emnteractiveEllements: I eonst
    cElement[] {tiventerac: Ip)oueGrup: AgGrogeing[], as: strnts(purposeemeiveElteractteIncrea
  private );
  }
  oin('\n\n'   ).jtter.'
 rience bepe your exon to makenformatie this ie uspose] || 'WGroup][purons[agexplanati
      ee => rposp(puurposes.ma p
    return    };
       }

   features.'ytelling ve stortiinterac to provide ndsce commayour voi process 'Weessing': ice_procvo
        'ions.',commendatd resights anino provide  responses tur emotionale analyze yois': 'Wnalysnal_a'emotio',
        rience.lling expeyteour storze y personalit andntene cour creativ store yo: 'Weion'atry_creto   's  -15
   e': { // 12adolescencrly_
      'ea     },quests.'
 our retand ynders u so we can into text your voice'We turncessing': ce_pro   'voike.',
     u might liies yosuggest storlings to feeion to your y attent': 'We paal_analysistion   'emo    ,
 in.'gahem alay with tu can p so yod characterstories anve your s'We san': eatiory_cr     'sto// 7-11
   ': { hooddle_child
      'mid'
      },deas.your story inderstand o uy t sao what youe listen tg': 'Wocessince_pr       'voi,
 ies.' better storke sad to mael happy oru fee when yonotic': 'We analysisal_'emotion       !',
 ctersorite charaur fav with yo storiese fun you makWe help': '_creation'story       / 3-6
 ': { /hildhood   'early_c {
   ns =lanatiot exp    cons
 {tringup): sup: AgeGrogeGro[], angrposes: strition(puplanapleExenerateSimate g 
  priv };
  }
 
   fo(age)olvementInalInvtParentent: this.gentalInvolvem    pareoup),
  s, ageGrnts(purposeeElemetivteraceateInnts: this.crctiveEleme  intera  ),
  Groupurposes, ageds(palAiateVisus.generalAids: thisu  viup),
    eGro, agurposesnation(ppleExplaenerateSimtion: this.g  explana   
 geGroup),tle(aeTiopriatApprAge this.get title:{
         return ge);
    
up(arotermineAgeGdethis.p = rou ageG   constNotice> {
 ChildPrivacy ): Promise<
 ing[]ses: str purpoer,
   : numb
    agevacyNotice(dlyPrildFrienenerateChisync g
  aface {erldPrivacyInts Chi
export classerface.tldPrivacyInt/src/Chirivacy-uikages/pipt
// pactypescr```

facey Interendly Privachild-Fri C

### 5.ER;
```EFIN Dql SECURITYNGUAGE plpgsEND;
$ LA;
ffected_rowsRETURN a    
 LOOP;
OOP;
  END
    END LCOUNT; ROW_ws +ected_rows = affd_roTICS affecteT DIAGNOS 
      GE    CASE;
    ENDtamp;
    mesdrawal_ti.withwal_recordwithdrat >  created_a  AND        d.user_id 
l_recorthdrawa= wi_id WHERE user         actions 
 nter_iM story  DELETE FRO      ' THEN
  n_datactioN 'intera  WHE         
       estamp;
rawal_timithdwal_record.wat > withdracreated_ ) AND    
      d.user_id_recorithdrawalner = wWHERE owibraries T id FROM l    SELEC    (
    N ary_id IibrWHERE l       
   tamp)mesl_tirawahdrd.witcoithdrawal_ree', wwal_datithdrae, 'w', trunymized_object('anouildb_b json =nt      conte
      tories SET    UPDATE s      y
 ry integrit storeserveo plete than de trather- Anonymize          -HEN
 ntent' TN 'story_coWHE             
    estamp;
 wal_timord.withdrawal_recrahdwit_at > ND created    A   er_id 
   al_record.us = withdrawHERE user_id          Wtions 
 emoLETE FROM        DEHEN
  ata' Temotional_dWHEN '       ory
 eg CASE catOOP
     es)
    Lta_categoril_record.da(withdrawaT unnestSELECy IN gorcate FOR consent
   ithdrawn  on wa basedonymize datelete or an D   --LOOP
 T NULL
   IS NOl_timestampthdrawa AND cr.wi  '1 hour'
  - INTERVAL W() > NOstampwal_timeithdraRE cr.wHE  Wp.id
   = dr.purpose_idoses dp ON cta_purpN dar
    JOInt_records cconseROM 
    Fmpestadrawal_timcr.withs, ta_categoriep.darpose_id, dd, cr.puCT cr.user_i 
    SELE_record INithdrawalOR w  Fthdrawals
t wiecent consen-- Find rEGIN
  = 0;
B :ER INTEGed_rowsect;
  affCORDord REwal_recithdra
  wLAREAS $
DECER URNS INTEGwal()
RETdraent_withafter_consata_leanup_dFUNCTION cLACE REATE OR REPup
Ca clean datt withdrawale consenion to handl- Funct
-R;
FINE DEsql SECURITYNGUAGE plpg LAND;
$URN;
E RET
  
  END LOOP;EXT;
 URN N    RETws;
rorotected_ := child_pedds_protect_recorild chgy;
   _strateion.deletcord:= policy_reon_taken 
    acti;cted_rows := afferocessedords_pec  r  able_name;
_record.ticyname := polble_    taresults
n  -- Retur  ;
    
 .idcy_recordliHERE id = po) 
    W NOW(eanup_at =last_clET 
    Slicies etention_podata_rDATE mp
    UPup timestast cleandate la
    -- Up    ;
ND IF    E;
   END CASE   ;
NTws = ROW_COUffected_roIAGNOSTICS aGET D             );
    period
   n_ioretenticy_record.      pol     _name,
 ablerd.tcy_reco     poli',
       %L - at < NOW()E created_     WHER
        reated_at), cimestamp''_tginal'ori true, 'onymized'',ject(''anb_build_obd = jsonET payloaPDATE %I S         'Uat(
    formTE       EXECUN
   THE' nonymize    WHEN 'a            
UNT;
  s = ROW_COrowcted_NOSTICS affe DIAG        GET;
    )
        on_periodrd.retenticy_reco poli         _name,
  ord.tabley_rec     polic     
  W() - %L',ated_at < NOW() OR cret < NO expires_aI WHEREROM %DELETE F         't(
   CUTE forma EXE         HEN
rd_delete' Tha 'EN  WH      n_strategy
ord.deletio_reclicy po  CASEtables
    user-data non-ention for ndard ret -- Sta    E
    
    ELSE;
   D CAS     ENT;
 _COUNROWrows = fected_CS afT DIAGNOSTI      GE;
           )   on_period
cord.retentire     policy_     me,
  _nad.tablerecor   policy_     
    ) - %L',at < NOW(OR created__at < NOW() E expiresHER        Wd_at)
     create'', mpl_timestagina true, ''orionymized'',ect(''an_objonb_buildext = jsont      c     L, 
  id = NULI SET user_PDATE %'U          t(
  UTE formaEXEC       ta
   d daireze expAnonymi     -- 
     mize' THENHEN 'anony   W        
  UNT;
      = ROW_COted_rowsechild_protAGNOSTICS c DI       GET     );
   
     n_periodrd.retentioicy_reco    pol       _name,
 record.tableicy_         pol  )',
            )
       
         NULLtamp IStimeswal_.withdraND cr         Ae 
       given = trusent_r.conAND c          d 
      u.ir.user_id = HERE c      W      cr 
    ent_records  FROM consECT 1     SEL  (
         OT EXISTS        AND Ne 
        tru =rotectedpa_p u.is_copHERE         Ws u 
     M userd FRO u.i     SELECT       (
    INND user_id() - %L Aat < NOWERE created_FROM %I WHELETE           'Dormat(
  CUTE f EXE
         ithdrawnnsent wrent coed AND paedriod is excetion pe retenelete ifdata, only dchild     -- For     
       
     ROW_COUNT;ted_rows =  affecDIAGNOSTICS     GET    );
       ame
     ord.table_ncy_recpoli          
  ',ue) = trtedecppa_prot is_coREusers WHE id FROM  (SELECTr_id NOT INseOW() AND u_at < NERE expiresROM %I WHE FELET          'Dat(
  E form      EXECUTst
    data firld n-chiDelete no        -- ' THEN
  rd_deleteEN 'ha        WHgy
strateion_rd.delet policy_recoASE   Ction
   er reteny strictsers, applrotected uFor COPPA-p
      -- es') THEN, 'storions'ctistory_interas', 'onIN ('emotible_name cy_record.tapoliIF data
    g for child  handlinecial-- Sp    
    rows := 0;
_protected_;
    child:= 0ed_rows    affect  LOOP
 TRUE
_active = ies WHERE ison_policata_retentiM dSELECT * FRO   rd IN 
  policy_reco
  FOREGER;
BEGINows INTrotected_rchild_pINTEGER;
  _rows ected  aff
 RECORD;cordrecy_liLARE
  po
) AS $
DECed INTEGERrotect_pecords_r
  childen TEXT,ction_takER,
  ad INTEGocesseprs_recordEXT,
  ame T_n(
  tableBLE
RETURNS TAtion()child_protec_with_expired_dataN cleanup_CTIOREPLACE FUN OR les
CREATEific ruld-specon with chiunctiretention fhanced data 
-- En

```sqlnatiop Implement and Cleanuon Retenti 4. Data
```

###);
  }
}    })
ISOString(ate().to new Destamp:tionTim dele
     rentEmail,d,
      pa  childUserI   
 , {ent'ted_by_pardata_dele', 'child_stement('sys.logAuditEv   await thideletion
  Log the 
    // });
    
   tionTokennfirma: co_tokenationnfirm    p_cod,
  serId: childUr_i      p_useta', {
lete_user_dac('derpse.his.supabat t
    awaitionon func deletiting GDPRsing exisa uhild datDelete c// 
        }
    ;
token')ion onfirmatalid cr('Invw Errohrow ne
      token) {tedTn !== expectionTokeif (confirmaerId);
    hildUsEmail, cn(parentonTokeDeletiates.generen = thidTok expecte   constoken
 n tonfirmatiofy c  // Veri
    
  ');
    } child thisy overauthoritnot have oes  d: Parented('Unauthorizow new Error thr  
   ld.data) {!chif (  
    ingle();
   .sil)
     arentEmai pl',emait_en .eq('parrId)
     d', childUse.eq('i      '*')
.select(     sers')
   .from('ubase
    .supaawait thisild =     const chuthority
nt aify pareer
    // Vvoid> {ise<om ): Prn: string
 mationToke   confir: string,
 ldUserIdng,
    chi striparentEmail:a(
    eteChildDatasync del }
  
  xport;
 ildDataE return ch  ;
    
    }))
 tring(te().toISOS Da: newimestampportT   exil,
   parentEma', {
      _by_parentexported, 'data_IddUserEvent(chiludit this.logA    awaithe export
   // Log t    
 };

    
      }ed_verificonsentrent_d.data.pas: chilsentStatuon   parentCcted,
     coppa_proteis_d.data.d: chilProtecte   coppa.age,
     hild.datachildAge: c       ing(),
 ).toISOStre(ew DatTimestamp: nport    ex
    rentEmail,tedBy: paxportReques   e     text: {
talCon paren
     .data,..exportData= {
      .DataExport t: ChildataExporst childDext
    contal contren // Add pa  
  });
    rId
    childUseuser_id:     p_', {
 _dataexport_usere.rpc('asis.supabait thata = awst exportDconta
    da all child  Export //
    
       }s child');
 over thiritythoave au hnot does Parentized: authoror('UnErrow new 
      thrld.data) {   if (!chi   
 e();
 gl      .sinail)
tEmarent_email', peq('paren)
      . childUserId'id',q(
      .e'*')    .select(ers')
  from('us      .base
.supa thishild = awaitconst crity
    arent authoVerify p{
    // xport> e<ChildDataE): Promis string
  ildUserId:g,
    ch: strinmailrentE
    paData(xportChildc e
  asyn
  }
  g()
    });).toISOStrinw Date(mestamp: ne    timail,
  ntEre    paId,
  pose     pur
 nt', {reed_by_paonsent_revok, 'cIdserhildUtEvent(cudiogAs.lwait thi
    aion the revocat    // Logl);
    
, nul'revoked_at'
      .is(Id])purposeoses', [urpntains('p
      .coId) childUser',ser_id    .eq('u
  ring() })().toISOSt new Dateoked_at:({ revdate   .upens')
   access_tokurpose_  .from('p
    eis.supabasth
    await purposer this fo tokens tive purposeany ac // Revoke  
   
   mp', null);timestahdrawal_  .is('wit   
  true)given',q('consent_.e   )
   eIdrposse_id', pueq('purpo      .)
erIdldUs, chir_id'.eq('use  })
          on'
evocatital_rd: 'parenwal_metho     withdra  ing(),
 trate().toISOSw Dne: al_timestamphdraw       wite({
   .updat
    ')ent_records.from('conse
      .supabasawait this
    consent// Revoke  
     }
   );
   his child'ity over t have authorotes nrent do: Paorizedor('Unauthrow new Err tha) {
      (!child.dat
    ifle();
     .sing
     arentEmail)il', prent_emaq('pa    .eerId)
  ildUs chd',  .eq('i')
    '*select(      .
m('users')     .froe
 abasit this.sup = awaonst childd
    cthis chilhority over s autt haify paren// Verd> {
    ise<voi
  ): Promstring: rposeId
    purId: string,Usehild    cg,
: strintEmail paren   dConsent(
evokeChilnc r
  
  asyrd;
  }shboa dareturn 
      }
   || []));
  a uests.datndingReqh(...(peests.pusdingRequrd.pen  dashboa     
     });
 
     n_atgi_lo: child.lastity   lastActiv     
],s.data || [consent: onsentseCiv act
       d_at,ifiehild.age_verdAt: crifie
        vechild.age,       age: ld.email,
 email: chi  
       child.id,   userId:    
 n.push({oard.childre   dashb
      
   nding');tus', 'pe .eq('sta       id)
hild._user_id', ceq('child   .*')
     select('       .ests')
 requnt_al_conse'parent   .from(abase
     s.suphis = await tdingRequest const pen   
   requestsg consentin // Get pend    
   null);
    stamp', awal_timehdrit  .is('wrue)
      ', tgivensent_eq('con     .id)
   d.ilser_id', ch    .eq('u    `)
    d)
    tion_perioption, retenname, descri(purpose_purposes    data_     
           *,ect(`
 .sel
        _records')('consentfrom
        .seis.supabas = await thst consent
      cononsentsurrent child's c // Get c   || []) {
  data children.child of  for (const ;
    
   
    } {}cessSummary:   dataAc  ,
 : []tsdingReques pen],
     n: [childre     mail,
 parentE
      oard = {arentalDashbard: Pdashbo
    const 
    );ted', trueecrotppa_p.eq('is_coail)
      ', parentEmrent_email   .eq('pa  
 select('*'))
      .('users'     .fromupabase
 it this.s = awadrenhilst cil
    cont emaparend with this sociate children as Get all//   
 shboard> {alDaomise<ParentPrng): ail: striard(parentEmentalDashboreatePar
  async colService {rentalContrort class Pa
exp.tstrolServicetalConrenes/Pavict/src/sergen-ackages/auth

// pa}
}}
         );
  
 urpose_name)(p => p.pata.mapes.dpospropriatePur    childAprId,
        use(
    lConsenttParentar.requesentManage cons    awaitbase);
  supaanager(this.ew ConsentM = ngersentManast con    con
  purposesiate -approprildor all ch fsent requestrental con pa/ Create  /   ata) {
 tePurposes.dAppropria(childf    i
   
  , true);iate'ild_approprq('ch  .e    ect('*')
      .sels')
a_purposem('dat     .fro
 aseis.supab= await thurposes ropriatePchildAppnst  co
   ected usersr COPPA-prote consent fohat requir tposesurGet all p{
    // e<void> ): Promisngtri: sserIdtProcess(unseniateCOPPACo initrivate async}
  
  p
    }ser_id);
  ta.ucation.dacess(verifintPronsePACotiateCOPniis.i thawait      13) {
 medAge <(confirs
    if ent procesPA consiate COPinitnder 13,  u child is  // If    
  _id);
usera..datificationid', ver      .eq('
      })
ISOString()Date().tow : neatfied_veri     age_on',
   atiirmconfrental_ethod: 'parification_m age_ve13,
       < nfirmedAge : coerifiedt_consent_v       paren 13,
 irmedAge <tected: confa_procopp is_      irmedAge,
 conf:        age
 update({s')
      .user .from('
     pabaseit this.su  awacord
  ate user re    // Updid);
    
ion.data.erificat vd',   .eq('i   })
           })
fied
   tityVeri parentIden   
       true,firmed:on  parentC     _data),
   tion.verifican.data(verificatioryptDataec.d  ...this      tData({
  is.encrypa: thon_daticati     verif   g(),
trinOS).toISew Date(estamp: ncation_tim  verified',
      s: 'verifin_statuificatio verge,
       rmedA_age: confiified
        vere({pdat    .urds')
  cation_recoe_verifi.from('ag
      abaseait this.sup aw record
   erification/ Update v
    /}
    t');
    ation requesicge verifor expired a'Invalid ew Error(w nhro   tata) {
   .dion(!verificat  if );
    
  ngle(    .si
  g())trinoISOSe().tmp', new Dattimestaxpiry_     .gt('eding')
 us', 'pen_statrificationve     .eq('en)
 toktoken', on_data->rificatiq('ve  .e
    )('*'ct  .sele')
    ion_records_verificat.from('age    abase
  it this.supawaification =    const veroid> {
 <vise ): Promean
 booled: erifientIdentityVer,
    pare: numbrmedAg confitring,
   n: s   toke(
 tioneConfirmaarentalAgnc verifyP}
  
  asy
    };
  emailt_parenail: user.arentEm      pa?.id,
cord.datcationReverifiicationId: erif
      vation: true,alVerificrent  requiresPa,
    trueuccess:  srn {
     tu 
    re);
   email
          user.e,
  declaredAg   
 n,icationToke      verifail,
er.parent_em    usil(
  nEmatioerificaAgeVntalendPare this.swaitt
    aenil to parion ema verificatend  
    // S();
   .single()
     lect  .se      })
    tring()
000).toISOS * 60 * 14 * 607 * 2te.now() + e(Dap: new Daty_timestam expirg',
       us: 'pendinatication_st     verifl }),
   nt_emaire.pail: userEmaente, parAg{ declareda(s.encryptDaton_data: thierificati   vge,
     edAge: declarfied_a veri     ion',
  atntal_confirmethod: 'pareification_mer        vserId,
d: u user_i({
       .insert
      ords')recfication_'age_verim(fro .base
     pathis.su await  =ationRecordt verific consn();
   SecureToke.generaten = thisionTokeverificat
    const ecordication r verifeate 
    // Cr
    }
        };ion'
 erificatage ved for irqunt email re: 'Pareror        errue,
on: tlVerificatiuiresParenta        reqs: false,
 succes{
       return {
      ) mail.parent_ef (!user
    id);
    er(userIthis.getUsr = await  use   const> {
 sultnRerificatioomise<AgeVe): Prber
  e: numeclaredAging,
    duserId: str
    ion(VerificatalAgeateParentitiinnc syte a priva
  }
  
 e, false);declaredAgd, (userIdAgelfDeclaressSehis.proce return tation
   lf-declar6+, allow se 1r users  // Fo
    
  
    }, true);aredAged, declserIAge(uredessSelfDeclarn this.proc    retu  
ge < 16) {eclaredA dge >= 13 &&declaredA    if ( review
foron but flag declaratilow self-al15, users 13- // For   
   }
  ge);
    redAserId, declaion(uAgeVerificatteParentaltiaini this.     return3) {
 Age < 1declared    if (irmation
tal confre parenrequilways 13, aers under // For us      
  t> {
ationResulgeVerifice<A Promis'
  ):ication'id_verifation' | confirm'parental_ | claration'd: 'self_deMethoficationriber,
    venumge:    declaredAng,
 serId: stri u(
   rificationVeinitiateAge
  async ;
  Loggerer: vate logg
  priatabase>;eClient<Dbasupae: Ste supabas privace {
 cationServifis AgeVericlas.ts
export cenServiatioficeVeri/Agservicessrc/nt//auth-ageckages pa//escript


```typsent SystemConParental ion and ficatri# 3. Age Ve
##

```
}
  };d: true } { alloweeturn  r     

    }
      break;s
   ation ruleta minimiz/ Apply da     /:
   inimization'case 'data_m    
      reak;
        bctions
    d restriime-basemplement t        // Iimit':
e_l case 'tim     
       
 break;      }
      };
    uired'  reqpproval a'Parentalse, reason: allowed: faleturn {         rent) {
  onsken.parentC&& !toChild f (token.is:
        il'l_approvarenta  case 'pa      
          break;
      }
      

          }' };dificationata moired for dnsent requarental co, reason: 'P: falsern { allowed  retu         ) {
 tConsentken.paren!to      if (   te') {
 'wrin === tiooperasChild && if (token.i   it':
     ge_limase 'a{
      c) ion.type (restrict    switch {
esult>alidationRise<VProm: ken
  )PurposeTooken:  tring,
   ation: st,
    operstrictionReata: Dction restriiction(
   yRestrsync apple a 
  privat  }
 rue };
owed: tn { allur   ret    
 );
rationns, opeedColumble, requestestedTa requrposeToken,cess(puDataAc this.log  await audit
  ccess fordata aLog //   
    
    }
     }sult;
   tionReestricreturn r       
 ed) {esult.allownRio(!restrict     if eToken);
 on, purposn, operatirictioction(restpplyRestri this.ait = awactionResultnst restri   coons) {
   .restrictipen.dataScokeeTopurposon of t restrictior (consons
    fctipply restri/ A    / }
    
       };
 )}` 
 join(', 'umns.dCol{denienied: $ deumn accessColreason: `        false, 
ed:  allow 
         return { {
    h > 0)gtolumns.lenedCeni   if (d 
    (col));
udesColumns.incl => !alloweder(colfiltdColumns.s = requesteiedColumn   const den[];
 Table] || uesteddColumns[reqloweaScope.aloseToken.dats = purpmnwedColust alloss
    con acceumn Check col //
    
   };
    }enied' ccess dn: 'Table a reasoalse,d: foweturn { all {
      reble))(requestedTaludesables.incedTowScope.allseToken.data!purpos
    if (accesble k ta
    // Chec
    
    }ed' };en expirson: 'Toklse, read: fa allowe    return {w()) {
  te.noesAt < DaeToken.expiros if (purp    
   }
   token' };
 id son: 'Invalfalse, rea{ allowed: turn      re
 ken) { (!purposeTo   if
    
 en(token);rifyTokthis.veit oken = awaurposeTnst p    cot> {
ationResulidse<Val
  ): Promidelete'ite' | ' 'wrread' |ation: ' oper
   : string[],olumnsestedCqu reng,
   : stribleuestedTa   reqring,
 n: sts(
    tokeurposeAcces validatePncasy {
  reewadlyMidss Privacexport claeware.ts
Middlacy/Privacysrc/privs//shared-type/ packages}

/}
};
  s
    tion    restric   ),
  )
   om(cols)]y.fr Arra[table, => ols])e, cap(([tablmns).mllowedColus(antriebject.e  O    s(
  t.fromEntries: ObjecllowedColumn),
      aedTables.from(alloway: ArrlowedTables {
      al
    return    );
    }
e'
      }mizonyn: 'an   action' },
     protectiold_hiose: 'curp pondition: {    c
    zation',minimita_ 'da      type:sh({
  ictions.pu restr    ;
      
      })sent'
 equire_contion: 'r
        ac },ge: 13 maxAtion: {      condi
  e_limit',  type: 'agsh({
      tions.pu   restriccted) {
   a_prote.is_copper (us  ifictions
  trd resd age-baseAd // ;
    
     })}
        eak;
 br         re']);
idence_sco', 'confript_text'transc'id', Set([ts'] = new nscripudio_tras['aolumnllowedC a        s');
 o_transcriptudies.add('alowedTablal
          ing':ce_processcase 'voi             
  break;
           ta']);
  ction_dae', 'interaaction_typ'interet(['id', ew Ss'] = n_interactionlumns['storyColowed        altext']);
  on', 'cdence', 'confi 'moodid',ew Set(['ns'] = n['emotiomnsedColu    allow');
      ionsnteractry_id('stoables.adowedT all         ions');
d('emotles.ad allowedTab  
       ysis':otional_analemase '      c        
  ;
      break   ']);
   _idtoryts', 's'traie', , 'namew Set(['id'= ns'] cterarachmns['luCo     allowed   ']);
  ibrary_ident', 'lle', 'conttit', '['idt('] = new Seoriesstumns[' allowedCol        );
 cters'.add('charaedTables   allow       
ories');d('stables.adwedTallo
          n':ry_creatiose 'sto
        caname) {urpose_pose.ph (pur  switc
    a accesswed datse to alloMap purpo{
      // rpose => h(puorEac purposes.f
    = [];
    ion[]trictDataRestions: estricconst r   = {};
  >>stringSet<d<string, corns: RelowedColum  const aling>();
  tr= new Set<sbles dTaonst allowe c any {
   : any):any[], user(purposes: taScopee generateDa
  privat
  }
  oken(token);is.signTrn th retu  
   });
  )
      String().toISOn.expiresAtew Date(tokeres_at: nxpi        eaScope,
: dat_scopedata),
        p.id.map(p => s: purposesse   purpo
     tokenHash,sh:  token_ha
       userId, user_id:        ({
  .insert   )
 s_tokens'cesrpose_acm('puro