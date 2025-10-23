import { insertIf } from '../../../../helpers';
import { DIAGNOSTICS_CHECKS_MAP } from './contstants';
import { PodkopShellMethods } from '../../../methods';
import { IDiagnosticsChecksItem } from '../../../services';
import { updateCheckStore } from './updateCheckStore';

export async function runDnsCheck() {
  const { order, title, code } = DIAGNOSTICS_CHECKS_MAP.DNS;

  updateCheckStore({
    order,
    code,
    title,
    description: _('Checking dns, please wait'),
    state: 'loading',
    items: [],
  });

  const dnsChecks = await PodkopShellMethods.checkDNSAvailable();

  if (!dnsChecks.success) {
    updateCheckStore({
      order,
      code,
      title,
      description: _('Cannot receive DNS checks result'),
      state: 'error',
      items: [],
    });

    throw new Error('DNS checks failed');
  }

  const data = dnsChecks.data;

  const allGood =
    Boolean(data.dns_on_router) &&
    Boolean(data.dhcp_config_status) &&
    Boolean(data.bootstrap_dns_status) &&
    Boolean(data.dns_status);

  const atLeastOneGood =
    Boolean(data.dns_on_router) ||
    Boolean(data.dhcp_config_status) ||
    Boolean(data.bootstrap_dns_status) ||
    Boolean(data.dns_status);

  function getStatus() {
    if (allGood) {
      return 'success';
    }

    if (atLeastOneGood) {
      return 'warning';
    }

    return 'error';
  }

  updateCheckStore({
    order,
    code,
    title,
    description: _('DNS checks passed'),
    state: getStatus(),
    items: [
      ...insertIf<IDiagnosticsChecksItem>(
        data.dns_type === 'doh' || data.dns_type === 'dot',
        [
          {
            state: data.bootstrap_dns_status ? 'success' : 'error',
            key: _('Bootsrap DNS'),
            value: data.bootstrap_dns_server,
          },
        ],
      ),
      {
        state: data.dns_status ? 'success' : 'error',
        key: _('Main DNS'),
        value: `${data.dns_server} [${data.dns_type}]`,
      },
      {
        state: data.dns_on_router ? 'success' : 'error',
        key: _('DNS on router'),
        value: '',
      },
      {
        state: data.dhcp_config_status ? 'success' : 'error',
        key: _('DHCP has DNS server'),
        value: '',
      },
    ],
  });

  if (!atLeastOneGood) {
    throw new Error('DNS checks failed');
  }
}
